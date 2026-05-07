---
name: uml-compliance
description: UML class diagram compliance, entity inventory, cross-layer naming consistency. invoke when adding structs, routes, or tables
glob: docs/diagrams/**/*.puml
---

## source of truth

class diagram: `docs/diagrams/class_diagram.puml`
sequence diagrams: `docs/diagrams/signup_and_login.puml`, `docs/diagrams/define_alert_rule.puml`, `docs/diagrams/acknowledge_critical_env.puml`, `docs/diagrams/request_interpret_data.puml`, `docs/diagrams/manage_alert_subscriptions.puml`
state charts: `docs/diagrams/telemetry_management_controller.puml`, `docs/diagrams/alerting_management_controller.puml`, `docs/diagrams/data_distribution_management_controller.puml`, `docs/diagrams/access_manager_controller.puml`, `docs/diagrams/encryption_manager.puml`

## controllers

| abstract interface         | concrete manager        | key methods                                                        |
| -------------------------- | ----------------------- | ------------------------------------------------------------------ |
| TelemetryManagement        | TelemetryManager        | `collectMetrics()`, `sendTelemetry()`                              |
| AccessManagement           | AccessManager           | `authenticate(Credentials)`, `authorize(String)`                   |
| AlertingManagement         | AlertingManager         | `triggerAlert(String)`, `resolveAlert(String)`                     |
| DataDistributionManagement | DataDistributionManager | `distribute(Data)`, `subscribe(Endpoint)`, `unsubscribe(Endpoint)` |

## boundary classes (15)

**TelemetryManager**: IngestSensorStreams, ValidateTelemetryData, MonitorIngestionHealth
**AccessManager**: SignupForAccount, LoginToSCEMAS, AuthorizeIoTDevices, ModifyAccountDetails, MonitorAccessStatus, ManageSecurityPermissions
**AlertingManager**: DefineThresholdRules, HandleActiveAlerts, DispatchAlertNotifications, ManageAlertSubscriptions
**DataDistributionManager**: FilterAggregatedData, ProvidePublicAPI, VisualizeCityMetrics, MonitorSCEMASPlatformStatus, ReportEnvironmentalHazard

## entity classes (12+)

- **IndividualSensorReading**: sensorId, metricType, value, zone, timestamp
- **TimeSeriesTelemetryDB**: stores sensor readings over time
- **AccountDB / UserInformation / ActiveSessionToken**: user auth and session management
- **DeviceIdentityRegistry**: device registration, status tracking
- **ThresholdRulebook**: metric type, threshold value, zone, rule status
- **AlertAndAuditLogDB**: alert id, severity, status, timestamp
- **AnalyticsDB**: aggregated metrics per zone and type
- **SCEMASPlatformStatusDB**: subsystem health (uptime, latency, error rate)
- **ApiTokenRegistry**: token hash, prefix, label, account id, expiry, revocation
- **AlertSubscriptionDB**: account id, zone, metric type, min severity, webhook url
- **HazardReportDB**: zone, category, description, status, contact email, reported by, reviewed by

## compliance rules

- if the class diagram says X knows Y, then X must have a method that references Y. no exceptions
- entity names must stay consistent across drizzle schema (`packages/db/src/schema.ts`) → zod types (`packages/types/`) → rust models (`scemas-core/src/models.rs`). rename everywhere or nowhere
- boundary classes map to tRPC routes or rust API endpoints

## sequence diagram contracts

- **signup/login**: user → encryption manager → access management → account DB → token issued
- **define alert rule**: admin → boundary → AlertingManager → ThresholdRulebook + audit log → confirmation
- **acknowledge critical alert**: operator → boundary → AlertingManager → audit log DB → status update → confirmation
- **request/interpret data**: client → functional client (digital signage) → public API (rate limited) → DDM → analytics DB → ZoneAQI[] (no auth required, sensitive fields stripped)
- **manage subscriptions**: operator → MAS boundary → AlertingManager → subscription DB → upsert → confirmation

## state charts

- **TelemetryManager** (pipe-and-filter): idle → ingesting (device auth) → validating (schema → range → timestamp filters) → persisting (store + aggregate) → idle. rejection path → ingestion_failures table. health monitoring runs in parallel via atomic counters
- **AlertingManager** (blackboard): shared state (ActiveRules HashMap + ActiveAlerts HashMap). 3 knowledge sources: evaluator (reading → rules → severity classification → persist), dispatcher (subscriptions → find_subscribers → audit), lifecycle (triggered → active → acknowledged → resolved). rule management admin path (create, toggle, delete) updates blackboard
- **DataDistributionManager**: INIT (connect sources, load analytics) → AUTH (validate token, authorize role) → DIST (4 parallel: data aggregation, operator service, public API, platform monitoring) → ERR (log, notify, attempt recovery)
- **AccessManager** (repository): init (connect data sources, load account DB) → entry dashboard → signup (collect info → device registry → store) / login (validate token → security perms → authorize role → session token) → modify account → error recovery
- **EncryptionManager**: binary encrypt ↔ decrypt states. note: documents TLS transport layer handled by Cloudflare per SR-INT1
