use chrono::{DateTime, TimeZone, Utc};
use scemas_core::error::{Error, Result};
use scemas_core::models::IndividualSensorReading;
use sqlx::PgPool;
use std::time::Instant;

pub struct DataDistributionManager {
    db: PgPool,
    started_at: Instant,
}

impl DataDistributionManager {
    pub fn new(db: PgPool) -> Self {
        Self {
            db,
            started_at: Instant::now(),
        }
    }

    pub async fn aggregate_reading(&self, reading: &IndividualSensorReading) -> Result<()> {
        let metric_type = reading.metric_type.to_string();
        let five_minute_bucket = bucket_start(reading.timestamp, 300)?;
        let hourly_bucket = bucket_start(reading.timestamp, 3600)?;

        self.refresh_average(
            &reading.zone,
            &metric_type,
            five_minute_bucket,
            300,
            "5m_avg",
        )
        .await?;
        self.refresh_maximum(&reading.zone, &metric_type, hourly_bucket, 3600, "1h_max")
            .await?;

        Ok(())
    }

    pub async fn record_ingestion_health(
        &self,
        total_received: u64,
        total_rejected: u64,
        latency_ms: f64,
    ) -> Result<()> {
        let error_rate = if total_received == 0 {
            0.0
        } else {
            total_rejected as f64 / total_received as f64
        };
        let status = if error_rate > 0.05 { "degraded" } else { "ok" };

        sqlx::query(
            "INSERT INTO platform_status (subsystem, status, uptime, latency_ms, error_rate) VALUES ($1, $2, $3, $4, $5)",
        )
        .bind("telemetry_ingestion")
        .bind(status)
        .bind(self.started_at.elapsed().as_secs_f64())
        .bind(latency_ms)
        .bind(error_rate)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    async fn refresh_average(
        &self,
        zone: &str,
        metric_type: &str,
        bucket: DateTime<Utc>,
        window_seconds: i64,
        aggregation_type: &str,
    ) -> Result<()> {
        let window_end = bucket + chrono::Duration::seconds(window_seconds);
        let aggregated_value = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT AVG(value) FROM sensor_readings WHERE zone = $1 AND metric_type = $2 AND time >= $3 AND time < $4",
        )
        .bind(zone)
        .bind(metric_type)
        .bind(bucket)
        .bind(window_end)
        .fetch_one(&self.db)
        .await?;

        if let Some(aggregated_value) = aggregated_value {
            self.persist_aggregate(
                zone,
                metric_type,
                aggregation_type,
                bucket,
                aggregated_value,
            )
            .await?;
        }

        Ok(())
    }

    async fn refresh_maximum(
        &self,
        zone: &str,
        metric_type: &str,
        bucket: DateTime<Utc>,
        window_seconds: i64,
        aggregation_type: &str,
    ) -> Result<()> {
        let window_end = bucket + chrono::Duration::seconds(window_seconds);
        let aggregated_value = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT MAX(value) FROM sensor_readings WHERE zone = $1 AND metric_type = $2 AND time >= $3 AND time < $4",
        )
        .bind(zone)
        .bind(metric_type)
        .bind(bucket)
        .bind(window_end)
        .fetch_one(&self.db)
        .await?;

        if let Some(aggregated_value) = aggregated_value {
            self.persist_aggregate(
                zone,
                metric_type,
                aggregation_type,
                bucket,
                aggregated_value,
            )
            .await?;
        }

        Ok(())
    }

    async fn persist_aggregate(
        &self,
        zone: &str,
        metric_type: &str,
        aggregation_type: &str,
        bucket: DateTime<Utc>,
        aggregated_value: f64,
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO analytics (zone, metric_type, aggregated_value, aggregation_type, time) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (zone, metric_type, aggregation_type, time) DO UPDATE SET aggregated_value = EXCLUDED.aggregated_value",
        )
        .bind(zone)
        .bind(metric_type)
        .bind(aggregated_value)
        .bind(aggregation_type)
        .bind(bucket)
        .execute(&self.db)
        .await?;

        Ok(())
    }
}

fn bucket_start(timestamp: DateTime<Utc>, window_seconds: i64) -> Result<DateTime<Utc>> {
    let unix_timestamp = timestamp.timestamp();
    let bucket = unix_timestamp - unix_timestamp.rem_euclid(window_seconds);

    Utc.timestamp_opt(bucket, 0).single().ok_or_else(|| {
        Error::Internal(format!("failed to compute aggregation bucket for {bucket}"))
    })
}
