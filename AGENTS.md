# scemas-platform

SE 3A04 PAC architecture demo. smart city environmental monitoring. two processes (rust :3001, next.js :3000), one postgres.

## structure

- `crates/` — rust workspace (scemas-core, scemas-telemetry, scemas-alerting, scemas-server)
- `packages/db/` — drizzle schema (database source of truth, all migrations live here)
- `packages/types/` — zod schemas + shared typescript types (mirrors rust models)
- `packages/dashboard/` — next.js 15 + tRPC (single API surface for all three PAC agents)
- `docs/diagrams/` — UML source of truth (class, sequence, state charts)
- `data/` — sample JSON sensor data for hamilton, ON

## running

```sh
source scripts/start-scemas.sh      # shell helpers + first-time setup
scemas-dev                          # starts db + engine + dashboard
```

or with nix: `nix develop` then `scemas-dev`.

## hard rules

- drizzle owns the schema. never create sqlx migrations
- entity names consistent across drizzle / @scemas/types / rust models. rename everywhere or nowhere
- UML class diagram (`docs/diagrams/class_diagram.puml`) is law
- conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- never add `Co-Authored-By` or `Co-authored-by` to commit messages
- no breadcrumb comments. just delete

## don'ts

`any` in typescript. `unwrap` in rust outside tests. `as` casts. `super::` imports. `lazy_static!`. mocks. over-engineering

## skills

detailed conventions and patterns live in `.agents/skills/`:

- **rust-engine**: rust conventions, pipe-and-filter, blackboard pattern, sqlx rules
- **dashboard**: PAC agents, tRPC, drizzle, typescript rules
- **uml-compliance**: entity inventory, boundary classes, cross-layer naming
- **testing**: no-mocks philosophy, test placement
- **react-effects**: useEffect anti-patterns and fixes
