use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id: Uuid,
    pub metric_type: String,
    pub threshold_value: f64,
    pub comparison: String,
    pub zone: Option<String>,
    pub rule_status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

pub async fn list(pool: &PgPool) -> Result<Vec<Rule>, sqlx::Error> {
    sqlx::query_as::<_, Rule>("SELECT * FROM threshold_rules ORDER BY created_at DESC")
        .fetch_all(pool)
        .await
}
