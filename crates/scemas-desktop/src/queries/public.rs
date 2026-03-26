use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;

// --- DISTINCT ON queries ---

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AggregateRow {
    pub zone: String,
    pub metric_type: String,
    pub aggregated_value: f64,
    pub aggregation_type: String,
    pub time: DateTime<Utc>,
    pub sample_count: Option<i32>,
}

/// DISTINCT ON (zone, metric_type) — latest aggregate per zone+metric.
pub async fn latest_aggregate_rows(
    pool: &PgPool,
    aggregation_type: &str,
) -> Result<Vec<AggregateRow>, sqlx::Error> {
    sqlx::query_as::<_, AggregateRow>(
        "SELECT DISTINCT ON (zone, metric_type)
             zone, metric_type, aggregated_value, aggregation_type, time, sample_count
         FROM analytics
         WHERE aggregation_type = $1
         ORDER BY zone, metric_type, time DESC",
    )
    .bind(aggregation_type)
    .fetch_all(pool)
    .await
}

/// DISTINCT zone list from devices table.
pub async fn device_zone_ids(pool: &PgPool) -> Result<Vec<String>, sqlx::Error> {
    sqlx::query_scalar::<_, String>("SELECT DISTINCT zone FROM devices ORDER BY zone ASC")
        .fetch_all(pool)
        .await
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedStatusEntry {
    pub zone: String,
    pub last_update: DateTime<Utc>,
}

/// DISTINCT ON (zone) — latest feed timestamp per zone.
pub async fn feed_status(
    pool: &PgPool,
    aggregation_type: &str,
) -> Result<Vec<FeedStatusEntry>, sqlx::Error> {
    let rows = sqlx::query_as::<_, FeedStatusRow>(
        "SELECT DISTINCT ON (zone) zone, time
         FROM analytics
         WHERE aggregation_type = $1
         ORDER BY zone, time DESC",
    )
    .bind(aggregation_type)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| FeedStatusEntry {
            zone: r.zone,
            last_update: r.time,
        })
        .collect())
}

#[derive(sqlx::FromRow)]
struct FeedStatusRow {
    zone: String,
    time: DateTime<Utc>,
}

// --- zone summary (composite) ---

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneSummary {
    pub zone_id: String,
    pub metrics: Vec<ZoneMetric>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneMetric {
    pub metric_type: String,
    pub value: f64,
    pub sample_count: Option<i32>,
    pub time: DateTime<Utc>,
}

/// builds zone summaries by chaining device_zone_ids + latest_aggregate_rows.
pub async fn zone_summary(
    pool: &PgPool,
    aggregation_type: &str,
) -> Result<Vec<ZoneSummary>, sqlx::Error> {
    let zones = device_zone_ids(pool).await?;
    let rows = latest_aggregate_rows(pool, aggregation_type).await?;

    let mut summaries: Vec<ZoneSummary> = zones
        .into_iter()
        .map(|zone_id| ZoneSummary {
            zone_id,
            metrics: vec![],
        })
        .collect();

    for row in rows {
        if let Some(summary) = summaries.iter_mut().find(|s| s.zone_id == row.zone) {
            summary.metrics.push(ZoneMetric {
                metric_type: row.metric_type,
                value: row.aggregated_value,
                sample_count: row.sample_count,
                time: row.time,
            });
        }
    }

    Ok(summaries)
}

// --- zone history ---

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ZoneHistoryPoint {
    pub zone: String,
    pub metric_type: String,
    pub aggregated_value: f64,
    pub aggregation_type: String,
    pub time: DateTime<Utc>,
    pub sample_count: Option<i32>,
}

pub async fn zone_history(
    pool: &PgPool,
    zones: &[String],
    metric_type: &str,
    aggregation_type: &str,
    window_hours: i32,
) -> Result<Vec<ZoneHistoryPoint>, sqlx::Error> {
    if zones.is_empty() {
        return Ok(vec![]);
    }

    sqlx::query_as::<_, ZoneHistoryPoint>(
        "SELECT zone, metric_type, aggregated_value, aggregation_type, time, sample_count
         FROM analytics
         WHERE zone = ANY($1)
           AND metric_type = $2
           AND aggregation_type = $3
           AND time >= NOW() - make_interval(hours => $4)
         ORDER BY time ASC",
    )
    .bind(zones)
    .bind(metric_type)
    .bind(aggregation_type)
    .bind(window_hours)
    .fetch_all(pool)
    .await
}
