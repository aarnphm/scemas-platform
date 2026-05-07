---
name: rust-engine
description: conventions, patterns, and workflow for the rust crates (core, telemetry, alerting, server)
glob: crates/**/*.rs
---

## conventions

- handle errors with thiserror + `?`. no unwraps outside tests
- `crate::` over `super::`. clean up lingering `super::` if spotted
- strong types over strings. enums and newtypes for closed domains (MetricType, Role, Comparison, AlertStatus, Severity)
- no `lazy_static!` or global state. pass context structs explicitly
- tests at bottom of module in `mod tests {}`. run only the touched crate: `cargo test -p <crate>`

## pre-commit

```sh
cargo fmt
cargo clippy --all --benches --tests --examples --all-features
```

## architectural patterns

### TelemetryManager: pipe-and-filter (`scemas-telemetry`)

sequential function composition. each filter: `fn(Reading) -> Result<Reading>`.

pipeline order: ingest → schema validate → range validate → timestamp validate → persist

- intentionally synchronous. the sequential calls ARE the pattern demonstration. NOT async channels
- filter independence: each filter rejects independently, no inter-filter dependency beyond the Reading
- plausible ranges: temperature [-50, 60]°C, humidity [0, 100]%, AQI [0, 1000], noise [0, 194]dB
- timestamp drift max: 5 minutes
- after persist, reading is passed to AlertingManager for blackboard evaluation
- controller in `scemas-telemetry/src/controller.rs`, filters in `scemas-telemetry/src/validate.rs`

### AlertingManager: blackboard (`scemas-alerting`)

shared `Blackboard` struct is the central data store. three knowledge sources read/write it:

1. **evaluator**: reads active rules + incoming reading, writes new alerts
2. **dispatcher**: reads alerts + subscriptions, determines notification targets
3. **lifecycle**: manages alert state machine (Triggered → Active → Acknowledged → Resolved, with Active → Resolved shortcut)

- intentionally synchronous. plain struct, no actors, no async tasks. demo throughput
- rules loaded from postgres into `blackboard.active_rules` on startup
- alerts persisted to DB and posted to `blackboard.active_alerts`
- severity classification: value/threshold ratio >1.5 = Critical, >1.2 = Warning, else Low
- subscription matching: by metric_type + zone + min_severity
- controller in `scemas-alerting/src/controller.rs`, blackboard in `scemas-alerting/src/blackboard.rs`

## database access

sqlx queries only. drizzle owns the schema. never create sqlx migrations.

`scemas-core/src/models.rs` is the rust entity source of truth. keep parity with drizzle schema (`packages/db/src/schema.ts`) and zod types (`packages/types/`).
