use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AuditLog {
    pub id: i64,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// cursor-paginated audit log (cursor is bigserial id).
pub async fn list(
    pool: &PgPool,
    limit: i64,
    cursor: Option<i64>,
) -> Result<super::alerts::CursorPage<AuditLog>, sqlx::Error> {
    let fetch_limit = limit + 1;

    let rows = sqlx::query_as::<_, AuditLog>(
        "SELECT * FROM audit_logs
         WHERE ($1::bigint IS NULL OR id < $1)
         ORDER BY id DESC
         LIMIT $2",
    )
    .bind(cursor)
    .bind(fetch_limit)
    .fetch_all(pool)
    .await?;

    let has_more = rows.len() as i64 > limit;
    let items: Vec<AuditLog> = rows.into_iter().take(limit as usize).collect();
    let next_cursor = if has_more {
        items.last().map(|a| a.id.to_string())
    } else {
        None
    };

    Ok(super::alerts::CursorPage { items, next_cursor })
}

pub async fn count(pool: &PgPool) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM audit_logs")
        .fetch_one(pool)
        .await
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AuditFrequency {
    pub hour: DateTime<Utc>,
    pub success: i64,
    pub errors: i64,
    pub total: i64,
}

pub async fn frequency(pool: &PgPool, hours: i32) -> Result<Vec<AuditFrequency>, sqlx::Error> {
    sqlx::query_as::<_, AuditFrequency>(
        "SELECT date_trunc('hour', created_at) as hour,
                COUNT(*) FILTER (WHERE action NOT LIKE '%_failed') as success,
                COUNT(*) FILTER (WHERE action LIKE '%_failed') as errors,
                COUNT(*) as total
         FROM audit_logs
         WHERE created_at > NOW() - make_interval(hours => $1)
         GROUP BY hour
         ORDER BY hour ASC",
    )
    .bind(hours)
    .fetch_all(pool)
    .await
}
