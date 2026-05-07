# scemas-server

axum binary. internal API on :3001. composes `scemas-telemetry` and `scemas-alerting` into a running server.

## this is NOT a public API

routes are prefixed `/internal/`. the dashboard's tRPC server calls these endpoints, not the browser directly.

## key files

- `src/main.rs` — startup: connect DB, load alert rules into blackboard, bind axum. handles SIGTERM/SIGINT for graceful shutdown via drain cascade
- `src/lib.rs` — `ScemasRuntime` struct: initialization sequence (INIT → AUTH → DIST) and `drain()` cascade (StopIngestion → DrainAPIRequests → DrainOperatorViews → StopMonitoring)
- `src/state.rs` — `AppState` struct (db pool, controllers, health counters, lifecycle state)
- `src/routes.rs` — route definitions. ingest route gates on lifecycle phase (returns 503 during drain)
- `src/distribution.rs` — `DataDistributionManager`: analytics aggregation, health snapshots, `flush_final()` for shutdown

## routes

| method | path                                               | purpose                                                                                                     |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/internal/auth/signup`                            | create account with argon2 password hash                                                                    |
| POST   | `/internal/auth/login`                             | verify credentials, issue JWT session                                                                       |
| POST   | `/internal/auth/reset-password`                    | admin password reset (hashes via argon2)                                                                    |
| POST   | `/internal/tokens`                                 | generate API token (SHA-256 hash, 90-day expiry, shown once)                                                |
| POST   | `/internal/telemetry/ingest`                       | pipe-and-filter entry point. validates + persists + triggers alert evaluation. **returns 503 during drain** |
| POST   | `/internal/alerting/rules`                         | create threshold rule                                                                                       |
| POST   | `/internal/alerting/rules/{rule_id}/status`        | enable/disable rule                                                                                         |
| POST   | `/internal/alerting/rules/{rule_id}/delete`        | delete rule                                                                                                 |
| POST   | `/internal/alerting/alerts/{alert_id}/acknowledge` | acknowledge alert                                                                                           |
| POST   | `/internal/alerting/alerts/{alert_id}/resolve`     | resolve alert                                                                                               |
| POST   | `/internal/alerting/alerts/batch-resolve`          | batch resolve (single transaction)                                                                          |
| POST   | `/internal/alerting/alerts/batch-acknowledge`      | batch acknowledge (single transaction)                                                                      |
| GET    | `/internal/health`                                 | ingestion counters + lifecycle phase + drain stage + inflight count                                         |

## server lifecycle

`[*] → Initializing → Authenticating → Distributing → Draining → ShuttingDown → [*]`

drain cascade (triggered by SIGTERM/SIGINT):

1. **StopIngestion** — reject new `/internal/telemetry/ingest` with 503
2. **DrainAPIRequests** — wait for in-flight public API requests
3. **DrainOperatorViews** — wait for in-flight operator requests
4. **StopMonitoring** — flush ingestion counters, write final platform_status
5. close DB pool

defined in `scemas-core/src/lifecycle.rs`, orchestrated by `ScemasRuntime::drain()`.

## data flow

```
tRPC (dashboard) → POST /internal/telemetry/ingest
  → TelemetryManager.ingest() [pipe-and-filter]
  → AlertingManager.evaluate_reading() [blackboard]
  → response
```
