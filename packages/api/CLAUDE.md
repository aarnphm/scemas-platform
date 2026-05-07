# @scemas/api

cloudflare worker + containers wrapper for the rust engine. this package is intentionally thin.

## purpose

- production ingress for the axum backend
- durable-object-backed container lifecycle for `scemas-server`
- runtime secret/env injection into the rust process
- zero business logic if we can help it, real app behavior still lives in `crates/scemas-server/`

## key files

- `src/worker.ts` — `Container` subclass plus fetch proxy to the single engine instance
- `wrangler.toml` — worker name, durable object binding, container image, migrations
- `package.json` — cloudflare dev/deploy commands

## runtime shape

```txt
browser / dashboard worker
  -> SCEMAS_API service binding
  -> @scemas/api worker
  -> ENGINE durable object
  -> rust container on :3001
  -> postgres
```

the seed script can also hit this worker directly once the public backend domain exists.

## env + bindings

- durable object binding: `ENGINE`
- required secrets: `DATABASE_URL`, `JWT_SECRET`, `DEVICE_AUTH_SECRET`
- fixed container env: `DEVICE_CATALOG_PATH=data/hamilton-sensor-catalog.json`, `RUST_LOG=info`, `RUST_PORT=3001`

## commands

```sh
bun --filter @scemas/api cf:dev
bun --filter @scemas/api cf:deploy
```

## rules

- keep this package transport-only. no auth, alert, or telemetry business logic here
- if the rust server route map changes, update this package and `packages/dashboard` together
- `max_instances = 1` is intentional until we deliberately revisit alerting/state assumptions
- cloudflare containers are still beta, so keep the config conservative and boring
