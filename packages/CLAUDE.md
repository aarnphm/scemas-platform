# packages/

bun workspace. typescript side of the monorepo.

## packages

| package      | npm name            | purpose                                                                    |
| ------------ | ------------------- | -------------------------------------------------------------------------- |
| `api/`       | `@scemas/api`       | cloudflare worker + container wrapper for the rust engine                  |
| `db/`        | `@scemas/db`        | drizzle schema + client factory. THE database source of truth              |
| `types/`     | `@scemas/types`     | zod schemas + inferred TS types. mirrors rust models                       |
| `dashboard/` | `@scemas/dashboard` | next.js 15 + tRPC. the three PAC agent dashboards (source of truth for UI) |
| `desktop/`   | `@scemas/desktop`   | vite + TanStack Router SPA for the tauri desktop app                       |
| `pager/`     | `@scemas/pager`     | standalone webhook echo with live web UI (bun + cloudflare worker)         |

## dashboard ↔ desktop

dashboard is the source of truth for components and styling. desktop mirrors the same views and theme (duplicated, not shared). when changing dashboard components, check if the corresponding desktop page needs the same update.

## conventions

- `bun` as runtime (not node/pnpm)
- never use `any` or `as` casts
- zod validates all inputs at the tRPC boundary
- drizzle owns migrations. never create sqlx migrations on the rust side

## cross-package imports

```
dashboard → imports from → @scemas/db (schema, client)
dashboard → imports from → @scemas/types (zod schemas, TS types)
dashboard → runtime fetches → @scemas/api (through INTERNAL_RUST_URL in cloud)
desktop   → imports from → @scemas/types (zod schemas, TS types)
desktop   → runtime invokes → tauri IPC → crates/scemas-desktop rust commands
```

## commands

```sh
bun install                          # all workspace deps
bun db:push                          # apply drizzle schema to postgres
bun db:generate                      # generate migration after schema change
bun --filter @scemas/api cf:dev      # cloudflare worker+container local dev
bun --filter @scemas/api cf:deploy   # deploy backend wrapper to cloudflare
bun --filter @scemas/dashboard dev   # next.js dev server
bun --filter @scemas/desktop dev     # vite dev server for desktop (:5173)
bun --filter @scemas/pager dev       # webhook echo with web UI on :9999
bun --filter @scemas/pager cf:deploy # deploy pager to cloudflare workers
bun run typecheck                    # turbo runs tsc across all packages
```
