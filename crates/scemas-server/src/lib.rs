pub mod access;
pub mod distribution;
pub mod routes;
pub mod state;

use scemas_alerting::controller::AlertingManager;
use scemas_core::config::Config;
use scemas_core::lifecycle::{DrainStage, LifecycleState, ServerPhase};
use scemas_telemetry::controller::TelemetryManager;
use scemas_telemetry::health::IngestionHealth;
use sqlx::PgPool;
use std::sync::Arc;

use crate::access::AccessManager;
use crate::distribution::DataDistributionManager;
use crate::state::AppState;

#[derive(Debug, thiserror::Error)]
pub enum RuntimeError {
    #[error(transparent)]
    Core(#[from] scemas_core::error::Error),

    #[error(transparent)]
    Database(#[from] sqlx::Error),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

#[derive(Clone)]
pub struct ScemasRuntime {
    pub pool: PgPool,
    pub access: Arc<AccessManager>,
    pub distribution: Arc<DataDistributionManager>,
    pub telemetry: Arc<TelemetryManager>,
    pub alerting: Arc<AlertingManager>,
    pub health: Arc<IngestionHealth>,
    pub lifecycle: LifecycleState,
}

impl ScemasRuntime {
    pub async fn from_config(config: &Config) -> Result<Self, RuntimeError> {
        let lifecycle = LifecycleState::new();

        let pool = PgPool::connect(&config.database_url).await?;
        tracing::info!("connected to database");

        lifecycle.set_phase(ServerPhase::Authenticating);

        let access = AccessManager::new(
            pool.clone(),
            config.jwt_secret.clone(),
            config.jwt_expiry_hours,
            config.device_auth_secret.clone(),
        );
        let registered_devices = access
            .sync_device_registry(&config.device_catalog_path)
            .await?;
        tracing::info!(registered_devices, "device registry synchronized");

        let distribution = DataDistributionManager::new(pool.clone());
        let telemetry = TelemetryManager::new(pool.clone());
        let alerting = AlertingManager::new(pool.clone());

        if let Err(error) = alerting.load_rules().await {
            tracing::warn!("failed to load alert rules: {error}");
        }

        let (base_recv, base_accepted, base_rejected) =
            distribution.load_ingestion_counters().await?;
        tracing::info!(
            base_recv,
            base_accepted,
            base_rejected,
            "restored ingestion counters"
        );

        lifecycle.set_phase(ServerPhase::Distributing);

        Ok(Self {
            pool,
            access: Arc::new(access),
            distribution: Arc::new(distribution),
            telemetry: Arc::new(telemetry),
            alerting: Arc::new(alerting),
            health: Arc::new(IngestionHealth::new_with_baseline(
                base_recv,
                base_accepted,
                base_rejected,
            )),
            lifecycle,
        })
    }

    pub fn app_state(&self) -> AppState {
        AppState {
            access: Arc::clone(&self.access),
            distribution: Arc::clone(&self.distribution),
            telemetry: Arc::clone(&self.telemetry),
            alerting: Arc::clone(&self.alerting),
            health: Arc::clone(&self.health),
            lifecycle: self.lifecycle.clone(),
        }
    }

    /// cascading drain sequence:
    /// StopIngestion → DrainAPIRequests → DrainOperatorViews → StopMonitoring
    ///
    /// each stage waits for the previous subsystem to quiesce before
    /// proceeding. the cascade mirrors the data flow: ingestion is upstream,
    /// API/operator are midstream consumers, monitoring is the last to go.
    pub async fn drain(&self) {
        tracing::info!("starting graceful drain cascade");
        self.lifecycle.set_phase(ServerPhase::Draining);

        // stage 1: stop accepting new sensor readings
        self.lifecycle.advance_drain(DrainStage::StopIngestion);
        tracing::info!(stage = "stop_ingestion", "rejecting new telemetry ingest");

        // stage 2: drain in-flight API requests
        self.lifecycle.advance_drain(DrainStage::DrainAPIRequests);
        tracing::info!(
            stage = "drain_api_requests",
            "waiting for in-flight requests"
        );
        self.wait_for_inflight().await;

        // stage 3: drain operator views (tRPC calls from dashboard)
        self.lifecycle.advance_drain(DrainStage::DrainOperatorViews);
        tracing::info!(
            stage = "drain_operator_views",
            "waiting for operator requests"
        );
        self.wait_for_inflight().await;

        // stage 4: stop monitoring, flush final state
        self.lifecycle.advance_drain(DrainStage::StopMonitoring);
        tracing::info!(stage = "stop_monitoring", "flushing final health snapshot");

        let snapshot = self.health.snapshot();
        if let Err(error) = self
            .distribution
            .flush_final(
                snapshot.total_received,
                snapshot.total_accepted,
                snapshot.total_rejected,
            )
            .await
        {
            tracing::warn!("failed to flush final counters during drain: {error}");
        }

        self.lifecycle.advance_drain(DrainStage::Complete);
        self.lifecycle.set_phase(ServerPhase::ShuttingDown);
        tracing::info!("drain cascade complete, shutting down");

        self.pool.close().await;
        self.lifecycle.set_phase(ServerPhase::Stopped);
        tracing::info!("database pool closed, server stopped");
    }

    async fn wait_for_inflight(&self) {
        let mut polls = 0;
        while self.lifecycle.inflight_count() > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
            polls += 1;
            if polls % 100 == 0 {
                tracing::info!(
                    inflight = self.lifecycle.inflight_count(),
                    "still waiting for in-flight requests"
                );
            }
            // hard timeout: 30 seconds
            if polls > 600 {
                tracing::warn!(
                    inflight = self.lifecycle.inflight_count(),
                    "drain timeout reached, forcing shutdown"
                );
                break;
            }
        }
    }
}

pub fn init_tracing() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .try_init()
        .ok();
}
