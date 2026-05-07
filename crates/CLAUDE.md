# crates/

rust workspace. internal processing engine on :3001 (scemas-server) and tauri desktop app (scemas-desktop).

## crates

| crate              | pattern         | purpose                                                                              |
| ------------------ | --------------- | ------------------------------------------------------------------------------------ |
| `scemas-core`      | —               | shared entity types, error handling, config, region/zone logic. no business logic    |
| `scemas-telemetry` | pipe-and-filter | validation pipeline: schema → range → timestamp → persist                            |
| `scemas-alerting`  | blackboard      | shared state struct, rule evaluation, alert lifecycle                                |
| `scemas-server`    | —               | axum binary composing all controllers into internal API on :3001                     |
| `scemas-desktop`   | —               | tauri 2.x desktop app. embedded postgres, 33 IPC commands, native tray/notifications |
| `scemas-cli`       | —               | `scemas` CLI: dev orchestration, health, rules, alerts, tokens, completions          |

## dependency graph

```
scemas-server
├── scemas-telemetry → scemas-core
└── scemas-alerting  → scemas-core

scemas-desktop
├── scemas-server (reuses ScemasRuntime, AccessManager, controllers)
├── scemas-telemetry → scemas-core
└── scemas-alerting  → scemas-core

scemas-cli
├── scemas-server
└── scemas-core
```

## conventions

- rust toolchain is pinned at the repo root in `rust-toolchain.toml`. do not silently drift docker or ci away from it
- `cargo fmt` then `cargo clippy --all --all-features` before commit
- no `unwrap` outside tests. use `?` with thiserror errors
- `crate::` imports, never `super::`
- strong types (enums, newtypes) over strings
- no global state (`lazy_static!`, `Once`). pass context structs
- tests at bottom of module in `mod tests {}`
- run only touched tests: `cargo test -p <crate>`

## relationship to typescript

entity structs in `scemas-core/src/models.rs` mirror:

- drizzle tables in `packages/db/src/schema.ts`
- zod schemas in `packages/types/src/index.ts`

field names must stay consistent across all three. rust uses `snake_case` internally, serde renames to `camelCase` at the JSON boundary.

## desktop ↔ dashboard parity

`scemas-desktop` exposes the same data as the dashboard's tRPC routers via tauri commands. when adding new tRPC procedures or drizzle queries in the dashboard, check if a corresponding tauri command + sqlx query is needed in `scemas-desktop/src/queries/` and `scemas-desktop/src/commands/`.
