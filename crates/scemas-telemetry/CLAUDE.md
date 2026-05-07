# scemas-telemetry

TelemetryManager controller. demonstrates **pipe-and-filter** architecture.

## the pattern

sensor data flows through sequential validation filters. each filter is a pure function: takes a reading, returns `Result<Reading, Error>`. if any filter rejects, the reading is dropped. the "pipe" is function composition in `controller.rs`.

```
JSON POST → schema_validator → range_validator → timestamp_validator → persist to DB
```

## key files

- `src/validate.rs` — the three filter functions. this is where the pipe-and-filter pattern lives
- `src/controller.rs` — `TelemetryManager` struct, orchestrates the pipeline
- `src/ingest.rs` — `IngestSensorStreams` boundary (JSON parsing)
- `src/health.rs` — `MonitorIngestionHealth` boundary (atomic counters)

## validation rules (from SRS)

- **schema**: sensor_id and zone must be non-empty
- **range**: value within plausible bounds per metric type (temp: -50..60°C, humidity: 0..100%, AQI: 0..1000 μg/m³, noise: 0..194 dB)
- **timestamp**: within 5-minute drift of server time (SRS PR-PA1)

## adding a new filter

add a `pub fn new_filter(reading: IndividualSensorReading) -> Result<IndividualSensorReading>` in `validate.rs`, then call it in the chain in `controller.rs:ingest()`.
