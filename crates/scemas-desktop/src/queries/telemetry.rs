use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::PgPool;

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SensorReading {
    pub id: i32,
    pub sensor_id: String,
    pub metric_type: String,
    pub value: f64,
    pub zone: String,
    pub time: DateTime<Utc>,
}

/// zone-filtered sensor readings with optional metric filter.
pub async fn get_by_zone(
    pool: &PgPool,
    zones: &[String],
    metric_type: Option<&str>,
    limit: i64,
) -> Result<Vec<SensorReading>, sqlx::Error> {
    if zones.is_empty() {
        return Ok(vec![]);
    }

    match metric_type {
        Some(mt) => {
            sqlx::query_as::<_, SensorReading>(
                "SELECT id, sensor_id, metric_type, value, zone, time
                 FROM sensor_readings
                 WHERE zone = ANY($1) AND metric_type = $2
                 ORDER BY time DESC
                 LIMIT $3",
            )
            .bind(zones)
            .bind(mt)
            .bind(limit)
            .fetch_all(pool)
            .await
        }
        None => {
            sqlx::query_as::<_, SensorReading>(
                "SELECT id, sensor_id, metric_type, value, zone, time
                 FROM sensor_readings
                 WHERE zone = ANY($1)
                 ORDER BY time DESC
                 LIMIT $2",
            )
            .bind(zones)
            .bind(limit)
            .fetch_all(pool)
            .await
        }
    }
}

/// latest reading per sensor (DISTINCT ON).
pub async fn get_latest(pool: &PgPool, limit: i64) -> Result<Vec<SensorReading>, sqlx::Error> {
    sqlx::query_as::<_, SensorReading>(
        "SELECT DISTINCT ON (sensor_id)
             id, sensor_id, metric_type, value, zone, time
         FROM sensor_readings
         ORDER BY sensor_id, time DESC
         LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeSeriesPoint {
    pub time: DateTime<Utc>,
    pub temperature: Option<f64>,
    pub humidity: Option<f64>,
    pub air_quality: Option<f64>,
    pub noise_level: Option<f64>,
}

/// aggregated time series pivoted by metric type.
pub async fn get_time_series(
    pool: &PgPool,
    zones: &[String],
    window_hours: i32,
) -> Result<Vec<TimeSeriesPoint>, sqlx::Error> {
    if zones.is_empty() {
        return Ok(vec![]);
    }

    // fetch raw analytics rows, then pivot in application code
    let rows = sqlx::query_as::<_, AnalyticsRow>(
        "SELECT zone, metric_type, aggregated_value, time
         FROM analytics
         WHERE zone = ANY($1)
           AND aggregation_type = '5m_avg'
           AND time >= NOW() - make_interval(hours => $2)
         ORDER BY time ASC",
    )
    .bind(zones)
    .bind(window_hours)
    .fetch_all(pool)
    .await?;

    // pivot by time bucket
    let mut map: std::collections::BTreeMap<DateTime<Utc>, TimeSeriesPoint> =
        std::collections::BTreeMap::new();

    for row in rows {
        let point = map.entry(row.time).or_insert_with(|| TimeSeriesPoint {
            time: row.time,
            temperature: None,
            humidity: None,
            air_quality: None,
            noise_level: None,
        });
        match row.metric_type.as_str() {
            "temperature" => point.temperature = Some(row.aggregated_value),
            "humidity" => point.humidity = Some(row.aggregated_value),
            "air_quality" => point.air_quality = Some(row.aggregated_value),
            "noise_level" => point.noise_level = Some(row.aggregated_value),
            _ => {}
        }
    }

    Ok(map.into_values().collect())
}

#[derive(sqlx::FromRow)]
struct AnalyticsRow {
    #[allow(dead_code)]
    zone: String,
    metric_type: String,
    aggregated_value: f64,
    time: DateTime<Utc>,
}
