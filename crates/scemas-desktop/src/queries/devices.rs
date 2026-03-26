use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub device_id: String,
    pub device_type: String,
    pub zone: String,
    pub status: String,
    pub registered_at: DateTime<Utc>,
}

pub async fn list(pool: &PgPool) -> Result<Vec<Device>, sqlx::Error> {
    sqlx::query_as::<_, Device>("SELECT * FROM devices ORDER BY registered_at DESC")
        .fetch_all(pool)
        .await
}

pub async fn get(pool: &PgPool, device_id: &str) -> Result<Option<Device>, sqlx::Error> {
    sqlx::query_as::<_, Device>("SELECT * FROM devices WHERE device_id = $1")
        .bind(device_id)
        .fetch_optional(pool)
        .await
}
