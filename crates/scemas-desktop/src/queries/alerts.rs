use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: Uuid,
    pub rule_id: Option<Uuid>,
    pub sensor_id: String,
    pub severity: i32,
    pub status: String,
    pub triggered_value: f64,
    pub zone: String,
    pub metric_type: String,
    pub acknowledged_by: Option<Uuid>,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

pub async fn get(pool: &PgPool, id: Uuid) -> Result<Option<Alert>, sqlx::Error> {
    sqlx::query_as::<_, Alert>("SELECT * FROM alerts WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn history(pool: &PgPool, limit: i64) -> Result<Vec<Alert>, sqlx::Error> {
    sqlx::query_as::<_, Alert>("SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1")
        .bind(limit)
        .fetch_all(pool)
        .await
}

pub async fn count(pool: &PgPool, zone: Option<&str>) -> Result<i64, sqlx::Error> {
    match zone {
        Some(z) => {
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM alerts WHERE zone = $1")
                .bind(z)
                .fetch_one(pool)
                .await
        }
        None => {
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM alerts")
                .fetch_one(pool)
                .await
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CursorPage<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
}

/// cursor-paginated alert list with optional status/zone/time filters.
pub async fn list(
    pool: &PgPool,
    status: Option<&str>,
    zone: Option<&str>,
    hours: Option<i32>,
    limit: i64,
    cursor: Option<DateTime<Utc>>,
) -> Result<CursorPage<Alert>, sqlx::Error> {
    // build dynamic query (sqlx doesn't support optional WHERE clauses natively)
    let mut conditions = vec!["1=1".to_string()];
    let mut param_idx = 1u32;

    if status.is_some() {
        conditions.push(format!("status = ${param_idx}"));
        param_idx += 1;
    }
    if zone.is_some() {
        conditions.push(format!("zone = ${param_idx}"));
        param_idx += 1;
    }
    if hours.is_some() {
        conditions.push(format!(
            "created_at > NOW() - make_interval(hours => ${param_idx})"
        ));
        param_idx += 1;
    }
    if cursor.is_some() {
        conditions.push(format!("created_at < ${param_idx}"));
        param_idx += 1;
    }

    let fetch_limit = limit + 1;
    let where_clause = conditions.join(" AND ");
    let _sql = format!(
        "SELECT * FROM alerts WHERE {where_clause} ORDER BY created_at DESC LIMIT ${param_idx}"
    );

    // unfortunately we have to build this manually since sqlx doesn't support conditional binds
    // use the simpler approach: fetch all with a generous filter
    let rows = sqlx::query_as::<_, Alert>(
        "SELECT * FROM alerts
         WHERE ($1::text IS NULL OR status = $1)
           AND ($2::text IS NULL OR zone = $2)
           AND ($3::int IS NULL OR created_at > NOW() - make_interval(hours => $3))
           AND ($4::timestamptz IS NULL OR created_at < $4)
         ORDER BY created_at DESC
         LIMIT $5",
    )
    .bind(status)
    .bind(zone)
    .bind(hours)
    .bind(cursor)
    .bind(fetch_limit)
    .fetch_all(pool)
    .await?;

    let has_more = rows.len() as i64 > limit;
    let items: Vec<Alert> = rows.into_iter().take(limit as usize).collect();
    let next_cursor = if has_more {
        items.last().map(|a| a.created_at.to_rfc3339())
    } else {
        None
    };

    Ok(CursorPage { items, next_cursor })
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AlertFrequency {
    pub hour: DateTime<Utc>,
    pub low: i64,
    pub warning: i64,
    pub critical: i64,
}

pub async fn frequency(pool: &PgPool, hours: i32) -> Result<Vec<AlertFrequency>, sqlx::Error> {
    sqlx::query_as::<_, AlertFrequency>(
        "SELECT date_trunc('hour', created_at) as hour,
                COUNT(*) FILTER (WHERE severity = 1) as low,
                COUNT(*) FILTER (WHERE severity = 2) as warning,
                COUNT(*) FILTER (WHERE severity = 3) as critical
         FROM alerts
         WHERE created_at > NOW() - make_interval(hours => $1)
         GROUP BY hour
         ORDER BY hour ASC",
    )
    .bind(hours)
    .fetch_all(pool)
    .await
}
