---
name: dashboard
description: next.js dashboard, tRPC routers, drizzle schema, PAC agent structure
glob: packages/**/*.{ts,tsx}
---

## PAC agents (one per user role)

three next.js route groups = three agents:

- `(operator)/` — **CityOperatorAgent**: dashboard with map, metrics, alerts, personalized alert subscriptions
- `(admin)/` — **SystemAdminAgent**: threshold rules CRUD, user management, platform health, audit logs
- `(public)/` — **PublicUserAgent**: AQI digital signage display, no auth required

each agent has:

- **P**resentation: react components in the route group
- **A**bstraction: data shapes (drizzle schema + zod types) and domain logic
- **C**ontrol: layout component coordinating auth gates, data fetching, navigation

## controllers (typescript side)

- **AccessManager**: repository pattern via tRPC auth router + drizzle queries. JWT, argon2. passive postgres store
- **DataDistributionManager**: tRPC root router composition. composes all routers, coordinates data flow to all three agents

## typescript rules

- never use `any`. model real shapes with proper types
- no `as` casts. if the types don't fit, fix the types
- zod validates all inputs at the tRPC boundary

## data layer

- drizzle schema in `packages/db/` is THE database source of truth. rust sqlx queries the same tables but never manages schema
- `@scemas/types` for shared type definitions. keep parity with rust models in `scemas-core/src/models.rs`
- tRPC is the single API surface. reads and simple writes go through drizzle directly
- writes requiring pattern demonstration (telemetry ingestion, alert evaluation) proxy from tRPC to the rust internal API on :3001

## workflow

```sh
bun run typecheck              # turbo runs tsc across all packages
bun --filter @scemas/dashboard dev   # next.js on :3000
bun db:generate                # after schema changes
bun db:push                    # apply to local postgres
```
