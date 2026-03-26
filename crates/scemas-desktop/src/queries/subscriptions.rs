use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub metric_types: Option<Vec<String>>,
    pub zones: Option<Vec<String>>,
    pub min_severity: Option<i32>,
    pub webhook_url: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

pub async fn get(pool: &PgPool, user_id: Uuid) -> Result<Option<Subscription>, sqlx::Error> {
    sqlx::query_as::<_, Subscription>("SELECT * FROM alert_subscriptions WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

pub async fn upsert(
    pool: &PgPool,
    user_id: Uuid,
    metric_types: Option<Vec<String>>,
    zones: Option<Vec<String>>,
    min_severity: Option<i32>,
    webhook_url: Option<String>,
) -> Result<(), sqlx::Error> {
    ::sqlx::query(
        "INSERT INTO alert_subscriptions (user_id, metric_types, zones, min_severity, webhook_url, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           metric_types = EXCLUDED.metric_types,
           zones = EXCLUDED.zones,
           min_severity = EXCLUDED.min_severity,
           webhook_url = EXCLUDED.webhook_url,
           updated_at = NOW()",
    )
    .bind(user_id)
    .bind(metric_types)
    .bind(zones)
    .bind(min_severity)
    .bind(webhook_url)
    .execute(pool)
    .await?;
    Ok(())
}
