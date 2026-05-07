# scemas-platform

SE 3A04 PAC architecture demo. smart city environmental monitoring. local dev is two app processes (rust :3001, next.js :3000) plus postgres. production adds a thin cloudflare api worker in front of rust.

## structure

- `crates/` — rust workspace (scemas-core, scemas-telemetry, scemas-alerting, scemas-server, scemas-desktop, scemas-cli)
- `crates/scemas-desktop/` — tauri 2.x desktop app (embedded postgres, remote auth, local processing)
- `packages/db/` — drizzle schema (database source of truth, all migrations live here)
- `packages/types/` — zod schemas + shared typescript types (mirrors rust models)
- `packages/api/` — cloudflare worker + container wrapper for deploying the rust engine
- on cloudflare, `packages/dashboard/` should reach `packages/api/` through a worker service binding, not a public `workers.dev` round-trip
- `packages/dashboard/` — next.js 15 + tRPC (single API surface for all three PAC agents)
- `packages/desktop/` — vite + react SPA for the tauri desktop app (TanStack Router + Query)
- `docs/diagrams/` — UML source of truth (class, sequence, state charts)
- `data/` — sample JSON sensor data for hamilton, ON

## running

```sh
docker-compose up -d                    # postgres
bun install && bun db:push              # deps + schema + default accounts
cargo run -p scemas-server              # rust engine on :3001
bun --filter @scemas/dashboard dev      # next.js on :3000
bun run scripts/seed.ts                 # sample sensor data
```

### desktop app

```sh
scemas dev desktop                      # postgres + schema + vite + tauri dev (all-in-one)
# or manually:
scemas dev up                           # start postgres + apply schema + default accounts
cargo tauri dev --manifest-path crates/scemas-desktop/Cargo.toml
```

the desktop app connects to the same postgres as `scemas-server` (via DATABASE_URL). auth is local-first against the shared database, with remote cloudflare fallback. `scemas dev desktop` handles the full startup sequence.

## toolchain

- rust is pinned in `rust-toolchain.toml`. use that exact stable toolchain locally, in ci, and in containers
- current docker builds should stay aligned with the rust toolchain pin

## default accounts

`@scemas/db`'s `ensure-users` script runs as part of `bun db:push`, so default accounts are created during postgres setup instead of rust-engine startup.

| email                  | password | role     | lands on     |
| ---------------------- | -------- | -------- | ------------ |
| `admin@example.com`    | `1234`   | admin    | `/rules`     |
| `operator@example.com` | `1234`   | operator | `/dashboard` |
| `viewer@example.com`   | `1234`   | viewer   | `/display`   |

idempotent. skips accounts that already exist.

## hard rules

- drizzle owns the schema. never create sqlx migrations
- entity names consistent across drizzle / @scemas/types / rust models. rename everywhere or nowhere
- UML class diagram (`docs/diagrams/class_diagram.puml`) is law
- conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- never add `Co-Authored-By` or `Co-authored-by` to commit messages
- package-level `CLAUDE.md` files are intentional. if a package shape, runtime, or deployment story changes, update the nearest `CLAUDE.md` in the same patch
- no breadcrumb comments. just delete
- always use bun, cargo here.

## don'ts

`any` in typescript. `unwrap` in rust outside tests. `as` casts. `super::` imports. `lazy_static!`. mocks. over-engineering
