// entity structs from UML class diagram
// every struct here maps 1:1 to a drizzle table in packages/db/src/schema.ts
// and a zod schema in packages/types/src/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, thiserror::Error)]
#[error("unknown {kind}: {value}")]
pub struct ParseModelError {
    kind: &'static str,
    value: String,
}

impl ParseModelError {
    fn new(kind: &'static str, value: &str) -> Self {
        Self {
            kind,
            value: value.to_owned(),
        }
    }
}

//  AccessManager entities

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInformation {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub role: Role,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Operator,
    Admin,
    Viewer,
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::Operator => write!(f, "operator"),
            Role::Admin => write!(f, "admin"),
            Role::Viewer => write!(f, "viewer"),
        }
    }
}

impl FromStr for Role {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "operator" => Ok(Role::Operator),
            "admin" => Ok(Role::Admin),
            "viewer" => Ok(Role::Viewer),
            other => Err(ParseModelError::new("role", other)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSessionToken {
    pub token_value: String,
    pub user_id: Uuid,
    pub role: Role,
    pub expiry: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceIdentity {
    pub device_id: String,
    pub device_type: MetricType,
    pub zone: String,
    pub status: DeviceStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DeviceStatus {
    Active,
    Inactive,
    Revoked,
}

impl std::fmt::Display for DeviceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeviceStatus::Active => write!(f, "active"),
            DeviceStatus::Inactive => write!(f, "inactive"),
            DeviceStatus::Revoked => write!(f, "revoked"),
        }
    }
}

impl FromStr for DeviceStatus {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "active" => Ok(DeviceStatus::Active),
            "inactive" => Ok(DeviceStatus::Inactive),
            "revoked" => Ok(DeviceStatus::Revoked),
            other => Err(ParseModelError::new("device status", other)),
        }
    }
}

//  TelemetryManager entities

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndividualSensorReading {
    pub sensor_id: String,
    pub metric_type: MetricType,
    pub value: f64,
    pub zone: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MetricType {
    Temperature,
    Humidity,
    AirQuality,
    NoiseLevel,
}

impl std::fmt::Display for MetricType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MetricType::Temperature => write!(f, "temperature"),
            MetricType::Humidity => write!(f, "humidity"),
            MetricType::AirQuality => write!(f, "air_quality"),
            MetricType::NoiseLevel => write!(f, "noise_level"),
        }
    }
}

impl FromStr for MetricType {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "temperature" => Ok(MetricType::Temperature),
            "humidity" => Ok(MetricType::Humidity),
            "air_quality" => Ok(MetricType::AirQuality),
            "noise_level" => Ok(MetricType::NoiseLevel),
            other => Err(ParseModelError::new("metric type", other)),
        }
    }
}

//  AlertingManager entities

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThresholdRule {
    pub id: Uuid,
    pub metric_type: MetricType,
    pub threshold_value: f64,
    pub comparison: Comparison,
    pub zone: Option<String>,
    pub rule_status: RuleStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Comparison {
    Gt,
    Lt,
    Gte,
    Lte,
}

impl std::fmt::Display for Comparison {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Comparison::Gt => write!(f, "gt"),
            Comparison::Lt => write!(f, "lt"),
            Comparison::Gte => write!(f, "gte"),
            Comparison::Lte => write!(f, "lte"),
        }
    }
}

impl FromStr for Comparison {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "gt" => Ok(Comparison::Gt),
            "lt" => Ok(Comparison::Lt),
            "gte" => Ok(Comparison::Gte),
            "lte" => Ok(Comparison::Lte),
            other => Err(ParseModelError::new("comparison", other)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RuleStatus {
    Active,
    Inactive,
}

impl std::fmt::Display for RuleStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuleStatus::Active => write!(f, "active"),
            RuleStatus::Inactive => write!(f, "inactive"),
        }
    }
}

impl FromStr for RuleStatus {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "active" => Ok(RuleStatus::Active),
            "inactive" => Ok(RuleStatus::Inactive),
            other => Err(ParseModelError::new("rule status", other)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: Uuid,
    pub rule_id: Uuid,
    pub sensor_id: String,
    pub severity: Severity,
    pub status: AlertStatus,
    pub triggered_value: f64,
    pub zone: String,
    pub metric_type: MetricType,
    pub created_at: DateTime<Utc>,
    pub acknowledged_by: Option<Uuid>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub resolved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, PartialOrd)]
#[repr(i32)]
pub enum Severity {
    Low = 1,
    Warning = 2,
    Critical = 3,
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Severity::Low => write!(f, "low"),
            Severity::Warning => write!(f, "warning"),
            Severity::Critical => write!(f, "critical"),
        }
    }
}

impl TryFrom<i32> for Severity {
    type Error = ParseModelError;

    fn try_from(value: i32) -> std::result::Result<Self, Self::Error> {
        match value {
            1 => Ok(Severity::Low),
            2 => Ok(Severity::Warning),
            3 => Ok(Severity::Critical),
            other => Err(ParseModelError::new("severity", &other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AlertStatus {
    Triggered,
    Active,
    Acknowledged,
    Resolved,
}

impl std::fmt::Display for AlertStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertStatus::Triggered => write!(f, "triggered"),
            AlertStatus::Active => write!(f, "active"),
            AlertStatus::Acknowledged => write!(f, "acknowledged"),
            AlertStatus::Resolved => write!(f, "resolved"),
        }
    }
}

impl FromStr for AlertStatus {
    type Err = ParseModelError;

    fn from_str(value: &str) -> std::result::Result<Self, Self::Err> {
        match value {
            "triggered" => Ok(AlertStatus::Triggered),
            "active" => Ok(AlertStatus::Active),
            "acknowledged" => Ok(AlertStatus::Acknowledged),
            "resolved" => Ok(AlertStatus::Resolved),
            other => Err(ParseModelError::new("alert status", other)),
        }
    }
}

//  DataDistributionManager entities

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsRecord {
    pub zone: String,
    pub metric_type: MetricType,
    pub aggregated_value: f64,
    pub aggregation_type: String,
    pub time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformStatus {
    pub subsystem: String,
    pub status: String,
    pub uptime: f64,
    pub latency_ms: f64,
    pub error_rate: f64,
    pub time: DateTime<Utc>,
}

//  IngestionFailure (ingestion_failures table)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestionFailure {
    pub id: i64,
    pub stage: String,
    pub sensor_id: String,
    pub metric_type: MetricType,
    pub zone: String,
    pub payload: serde_json::Value,
    pub error: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

//  DataDistributionManager: hazard reports (CP-C3)

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HazardReport {
    pub id: Uuid,
    pub zone: String,
    pub category: HazardReportCategory,
    pub description: String,
    pub status: HazardReportStatus,
    pub contact_email: Option<String>,
    pub reported_by: Option<Uuid>,
    pub reviewed_by: Option<Uuid>,
    pub review_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HazardReportCategory {
    EnvironmentalHazard,
    SystemMisuse,
    InappropriateContent,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HazardReportStatus {
    Pending,
    Reviewing,
    Resolved,
    Dismissed,
}

//  Innovative feature: alert subscriptions

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertSubscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub metric_types: Vec<MetricType>,
    pub zones: Vec<String>,
    pub min_severity: Severity,
    pub webhook_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // PAC (Presentation-Abstraction-Control) architecture tests
    //
    // SCEMAS has three PAC agents, each with a distinct presentation layer:
    //   - Operator agent  → /dashboard, /alerts, /metrics, /subscriptions
    //   - Admin agent     → /rules, /users, /health, /audit
    //   - Public agent    → /display
    //
    // The Role enum is the abstraction layer between the control layer
    // (AccessManager / JWT validation) and the presentation layer (Next.js
    // route groups). Route enforcement itself lives on the frontend in
    // packages/dashboard/middleware.ts and the (operator)/, (admin)/,
    // (public)/ route group folders.
    //
    // These tests verify the abstraction layer: that roles parse correctly,
    // serialize consistently, and represent three distinct agents.

    #[test]
    fn role_round_trips_through_string_representation() {
        // JWT claims and DB values must serialize and deserialize consistently
        // so the control layer always routes to the correct presentation agent.
        let cases = [
            ("operator", Role::Operator),
            ("admin", Role::Admin),
            ("viewer", Role::Viewer),
        ];
        for (s, role) in cases {
            let parsed: Role = s.parse().expect("known role string must parse");
            assert_eq!(parsed, role);
            assert_eq!(role.to_string(), s);
        }
    }

    #[test]
    fn unrecognized_role_string_is_rejected_by_abstraction_layer() {
        // The abstraction layer must reject unknown roles so the control layer
        // never routes to an undefined agent.
        assert!("superuser".parse::<Role>().is_err());
        assert!("ADMIN".parse::<Role>().is_err());
        assert!("".parse::<Role>().is_err());
    }

    #[test]
    fn three_pac_agent_roles_are_distinct() {
        // Each role maps to a separate PAC agent. No two roles should be equal,
        // which would collapse two agents into one and break the PAC invariant.
        assert_ne!(Role::Operator, Role::Admin);
        assert_ne!(Role::Admin, Role::Viewer);
        assert_ne!(Role::Operator, Role::Viewer);
    }
}
