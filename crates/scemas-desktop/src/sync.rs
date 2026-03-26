use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::watch;

use crate::auth::RemoteAuth;

/// background sync service that pulls data from remote and pushes local changes.
/// uses a watch channel for shutdown signaling.
pub struct SyncService {
    auth: Arc<RemoteAuth>,
    pool: PgPool,
    interval: Duration,
    shutdown_rx: watch::Receiver<bool>,
}

impl SyncService {
    pub fn new(
        auth: Arc<RemoteAuth>,
        pool: PgPool,
        interval: Duration,
        shutdown_rx: watch::Receiver<bool>,
    ) -> Self {
        Self {
            auth,
            pool,
            interval,
            shutdown_rx,
        }
    }

    pub async fn run(&mut self) {
        tracing::info!(
            interval_secs = self.interval.as_secs(),
            "sync service started"
        );

        loop {
            tokio::select! {
                _ = tokio::time::sleep(self.interval) => {
                    if let Err(e) = self.tick().await {
                        tracing::warn!("sync tick failed: {e}");
                    }
                }
                _ = self.shutdown_rx.changed() => {
                    tracing::info!("sync service shutting down");
                    break;
                }
            }
        }
    }

    async fn tick(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.pull_remote().await?;
        self.push_queued().await?;
        Ok(())
    }

    /// pull recent data from remote API into local tables.
    async fn pull_remote(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let base_url = &self.auth.base_url();

        // pull rules from remote
        let resp = reqwest::get(format!("{base_url}/api/v1/rules")).await;
        match resp {
            Ok(r) if r.status().is_success() => {
                let rules: Vec<serde_json::Value> = r.json().await?;
                tracing::debug!(count = rules.len(), "pulled remote rules");
                // upsert into local threshold_rules
                for rule in rules {
                    if let (Some(id), Some(metric_type), Some(threshold_value), Some(comparison)) = (
                        rule.get("id").and_then(|v| v.as_str()),
                        rule.get("metricType").and_then(|v| v.as_str()),
                        rule.get("thresholdValue").and_then(|v| v.as_f64()),
                        rule.get("comparison").and_then(|v| v.as_str()),
                    ) {
                        let zone = rule.get("zone").and_then(|v| v.as_str());
                        let rule_status = rule
                            .get("ruleStatus")
                            .and_then(|v| v.as_str())
                            .unwrap_or("active");

                        let _ = sqlx::query(
                            "INSERT INTO threshold_rules (id, metric_type, threshold_value, comparison, zone, rule_status)
                             VALUES ($1::uuid, $2, $3, $4, $5, $6)
                             ON CONFLICT (id) DO UPDATE
                             SET metric_type = EXCLUDED.metric_type,
                                 threshold_value = EXCLUDED.threshold_value,
                                 comparison = EXCLUDED.comparison,
                                 zone = EXCLUDED.zone,
                                 rule_status = EXCLUDED.rule_status",
                        )
                        .bind(id)
                        .bind(metric_type)
                        .bind(threshold_value)
                        .bind(comparison)
                        .bind(zone)
                        .bind(rule_status)
                        .execute(&self.pool)
                        .await;
                    }
                }
            }
            Ok(r) => tracing::debug!(status = %r.status(), "remote rules endpoint unavailable"),
            Err(e) => tracing::debug!("remote unreachable: {e}"),
        }

        Ok(())
    }

    /// push queued local changes to remote.
    async fn push_queued(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // fetch pending items from sync_queue
        let items = sqlx::query_as::<_, SyncQueueItem>(
            "SELECT id, command, payload, status FROM sync_queue
             WHERE status = 'pending'
             ORDER BY created_at ASC
             LIMIT 50",
        )
        .fetch_all(&self.pool)
        .await?;

        if items.is_empty() {
            return Ok(());
        }

        let base_url = self.auth.base_url();
        let client = reqwest::Client::new();

        for item in &items {
            let endpoint = match item.command.as_str() {
                "telemetry_ingest" => format!("{base_url}/internal/telemetry/ingest"),
                "rules_create" => format!("{base_url}/internal/alerting/rules"),
                other => {
                    tracing::warn!(command = other, "unknown sync command, marking failed");
                    let _ = sqlx::query("UPDATE sync_queue SET status = 'failed' WHERE id = $1")
                        .bind(item.id)
                        .execute(&self.pool)
                        .await;
                    continue;
                }
            };

            let resp = client.post(&endpoint).json(&item.payload).send().await;

            let new_status = match resp {
                Ok(r) if r.status().is_success() => "synced",
                Ok(r) => {
                    tracing::debug!(status = %r.status(), command = %item.command, "sync push rejected");
                    "failed"
                }
                Err(e) => {
                    tracing::debug!(command = %item.command, "sync push failed: {e}");
                    break; // stop pushing if remote is down
                }
            };

            let _ = sqlx::query("UPDATE sync_queue SET status = $1 WHERE id = $2")
                .bind(new_status)
                .bind(item.id)
                .execute(&self.pool)
                .await;
        }

        let synced = items.len();
        tracing::debug!(synced, "sync push complete");

        Ok(())
    }
}

#[derive(sqlx::FromRow)]
struct SyncQueueItem {
    id: i64,
    command: String,
    payload: serde_json::Value,
    #[allow(dead_code)]
    status: String,
}
