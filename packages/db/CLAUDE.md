# @scemas/db

drizzle schema. this package is the single source of truth for database structure.

## key files

- `src/schema.ts` — all 13 tables. every table maps 1:1 to a UML entity class
- `src/client.ts` — db client helpers. local node dev can reuse a client, but cloudflare worker runtime must create request-scoped postgres clients
- `drizzle.config.ts` — drizzle-kit config (reads DATABASE_URL from env)

## tables (from UML class diagram)

`accounts`, `apiTokens`, `devices`, `sensorReadings`, `thresholdRules`, `alerts`, `auditLogs`, `alertSubscriptions`, `analytics`, `platformStatus`, `oauthClients`, `oauthCodes`, `oauthTokens`

## after changing schema

```sh
bun db:generate   # creates migration in drizzle/
bun db:push       # applies to local postgres
```

rust sqlx queries the same tables but never manages migrations. if you add a column here, you may need to update the sqlx query in the corresponding rust crate.

## deployment notes

- drizzle migrations and `ensure-users` run against the direct `DATABASE_URL`, not through cloudflare workers
- the dashboard worker should use hyperdrive or an equivalent worker-safe postgres path
- the rust backend container uses the same schema through its direct `DATABASE_URL`

## naming

drizzle uses camelCase (`sensorId`). postgres columns are snake_case (`sensor_id`). drizzle handles the mapping. rust models use snake_case natively with serde rename for JSON.
