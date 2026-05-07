# @scemas/types

zod schemas and inferred typescript types for all SCEMAS entities. this package is the validation and type layer shared by the dashboard.

## key file

- `src/index.ts` — everything in one file. zod schemas + `z.infer<>` types

## mirrors

every type here has a corresponding:

- rust struct in `crates/scemas-core/src/models.rs`
- drizzle table in `packages/db/src/schema.ts`

## adding a field

update in all three places. field names must match (camelCase in TS, snake_case in rust with serde rename).

## schemas for tRPC input validation

`SensorReadingSchema`, `SignupSchema`, `LoginSchema`, `CreateThresholdRuleSchema`, `UpdateAlertSubscriptionSchema` — these are used as `.input()` validators in tRPC procedures.

## PAC abstraction types

`ZoneAQI` — the public-facing aggregated type. strips raw sensor data. this is the Abstraction layer for the PublicUserAgent.
