/**
 * Generates crates/scemas-desktop/resources/schema.sql from the live postgres schema.
 *
 * Requires:
 *   - postgres running with drizzle schema applied (bun db:push)
 *   - DATABASE_URL set
 *
 * Usage:
 *   bun run scripts/sync-desktop-schema.ts
 */
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://localhost:5432/scemas'
const OUTPUT = new URL('../../../crates/scemas-desktop/resources/schema.sql', import.meta.url).pathname

const sql = postgres(DATABASE_URL)

const tables = await sql<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`

const lines: string[] = [
  '-- auto-generated from @scemas/db drizzle schema',
  `-- run: bun --filter @scemas/db sync-desktop-schema`,
  `-- date: ${new Date().toISOString().split('T')[0]}`,
  '',
]

for (const { tablename } of tables) {
  // get CREATE TABLE DDL via pg_catalog
  const [{ ddl }] = await sql<{ ddl: string }[]>`
    SELECT
      'CREATE TABLE IF NOT EXISTS ' || c.relname || ' (' || E'\n' ||
      string_agg(
        '    ' || a.attname || ' ' ||
        pg_catalog.format_type(a.atttypid, a.atttypmod) ||
        CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END ||
        COALESCE(' DEFAULT ' || pg_catalog.pg_get_expr(d.adbin, d.adrelid), ''),
        E',\n'
        ORDER BY a.attnum
      ) || E'\n);\n' AS ddl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE c.relname = ${tablename} AND n.nspname = 'public'
    GROUP BY c.relname
  `
  lines.push(ddl)

  // primary key
  const pks = await sql<{ conname: string; columns: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) AS columns
    FROM pg_constraint
    WHERE conrelid = ${tablename}::regclass AND contype = 'p'
  `
  // unique constraints (not indexes)
  const uqs = await sql<{ conname: string; columns: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) AS columns
    FROM pg_constraint
    WHERE conrelid = ${tablename}::regclass AND contype = 'u'
  `
  // foreign keys
  const fks = await sql<{ conname: string; columns: string }[]>`
    SELECT conname, pg_get_constraintdef(oid) AS columns
    FROM pg_constraint
    WHERE conrelid = ${tablename}::regclass AND contype = 'f'
  `

  // indexes (non-pk, non-unique-constraint)
  const idxs = await sql<{ indexname: string; indexdef: string }[]>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ${tablename}
      AND indexname NOT IN (
        SELECT conname FROM pg_constraint WHERE conrelid = ${tablename}::regclass
      )
  `

  for (const idx of idxs) {
    const def = idx.indexdef
      .replace(/^CREATE INDEX/, 'CREATE INDEX IF NOT EXISTS')
      .replace(/^CREATE UNIQUE INDEX/, 'CREATE UNIQUE INDEX IF NOT EXISTS')
    lines.push(def + ';')
  }

  lines.push('')
}

// desktop-only tables not in drizzle schema
lines.push('-- desktop-only tables (not in @scemas/db)')
lines.push(`CREATE TABLE IF NOT EXISTS sync_queue (
    id BIGSERIAL PRIMARY KEY,
    command TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`)
lines.push('CREATE INDEX IF NOT EXISTS sync_queue_status_created_at_idx ON sync_queue (status, created_at);')
lines.push('')

await Bun.write(OUTPUT, lines.join('\n'))
console.log(`wrote ${OUTPUT}`)
console.log(`${tables.length} tables + 1 desktop-only table`)

await sql.end()
