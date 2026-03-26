use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PlatformStatusRow {
    pub id: i32,
    pub subsystem: String,
    pub status: String,
    pub uptime: Option<f64>,
    pub latency_ms: Option<f64>,
    pub error_rate: Option<f64>,
    pub time: DateTime<Utc>,
}

pub async fn status(pool: &PgPool, limit: i64) -> Result<Vec<PlatformStatusRow>, sqlx::Error> {
    sqlx::query_as::<_, PlatformStatusRow>(
        "SELECT * FROM platform_status ORDER BY time DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct IngestionFailure {
    pub id: i64,
    pub stage: String,
    pub sensor_id: String,
    pub metric_type: String,
    pub zone: String,
    pub payload: serde_json::Value,
    pub error: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

pub async fn ingestion_failures(
    pool: &PgPool,
    limit: i64,
) -> Result<Vec<IngestionFailure>, sqlx::Error> {
    sqlx::query_as::<_, IngestionFailure>(
        "SELECT * FROM ingestion_failures WHERE status = 'pending' ORDER BY created_at DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}
