# scemas-alerting

AlertingManager controller. demonstrates **blackboard** architecture.

## the pattern

a shared state struct (`Blackboard`) holds active rules and alerts. "knowledge sources" read from and write to the blackboard:

1. **evaluator** — reads new sensor readings + active rules, writes alerts if threshold exceeded
2. **dispatcher** — reads alerts + operator subscriptions, determines who to notify
3. **lifecycle** — manages alert state transitions: triggered → active → acknowledged → resolved

the blackboard is a plain struct (not `Arc<RwLock<>>`). synchronous access is fine at demo throughput.

## key files

- `src/blackboard.rs` — `Blackboard` struct (the shared state)
- `src/evaluator.rs` — rule evaluation logic, creates alerts when thresholds exceeded
- `src/dispatcher.rs` — matches alerts to operator subscriptions
- `src/lifecycle.rs` — alert state machine with valid transition checks
- `src/controller.rs` — `AlertingManager` struct, loads rules from DB, coordinates evaluation

## alert severity classification

based on how far past the threshold: >1.5x = critical, >1.2x = warning, else = low.

## alert dedup

alerts are deduped on `sensor_id + metric_type + zone`. the blackboard checks for existing active alerts before creating new ones.
