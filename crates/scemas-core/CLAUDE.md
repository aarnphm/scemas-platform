# scemas-core

shared types crate. no business logic, no database queries, no IO. just struct definitions and error types that every other crate imports.

## key files

- `src/models.rs` — ALL entity structs from the UML class diagram. this is the rust source of truth for data shapes
- `src/error.rs` — `Error` enum with `thiserror`, implements axum `IntoResponse`. includes `ServiceUnavailable` (503) for drain state
- `src/config.rs` — `Config` struct loaded from env vars
- `src/lifecycle.rs` — `ServerPhase` enum (Initializing → Authenticating → Distributing → Draining → ShuttingDown → Stopped), `DrainStage` enum (StopIngestion → DrainAPIRequests → DrainOperatorViews → StopMonitoring → Complete), `LifecycleState` with atomic state tracking

## adding a new entity

1. add struct here in `models.rs` (with `Serialize`, `Deserialize`)
2. add drizzle table in `packages/db/src/schema.ts`
3. add zod schema in `packages/types/src/index.ts`
4. all three must use the same field names (rust snake_case ↔ serde camelCase ↔ ts camelCase)

## entity list (from class diagram)

`UserInformation`, `Role`, `ActiveSessionToken`, `DeviceIdentity`, `IndividualSensorReading`, `MetricType`, `ThresholdRule`, `Comparison`, `Alert`, `Severity`, `AlertStatus`, `AnalyticsRecord`, `PlatformStatus`, `AlertSubscription`
