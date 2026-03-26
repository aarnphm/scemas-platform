use scemas_core::models::{
    Comparison, IndividualSensorReading, MetricType, RuleStatus, ThresholdRule,
};
use scemas_server::ScemasRuntime;
use serde::Deserialize;
use std::time::Instant;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::error::DesktopError;
use crate::notifications;
use crate::queries;
use crate::tray;

type Result<T> = std::result::Result<T, DesktopError>;

// --- telemetry ---

#[tauri::command]
pub async fn telemetry_ingest(
    app: AppHandle,
    runtime: State<'_, ScemasRuntime>,
    reading: IndividualSensorReading,
) -> Result<serde_json::Value> {
    if !runtime.lifecycle.phase().is_accepting_ingestion() {
        return Err(DesktopError::Unavailable(
            "not accepting telemetry".to_string(),
        ));
    }

    runtime.lifecycle.track_request();
    let request_started_at = Instant::now();
    runtime.health.record_received();

    let mut reading = reading;
    reading.zone = scemas_core::regions::normalize_zone_id(&reading.zone, Some(&reading.sensor_id));

    let reading = match runtime.telemetry.ingest(reading).await {
        Ok(r) => r,
        Err(e) => {
            runtime.health.record_rejected();
            runtime.lifecycle.release_request();
            return Err(DesktopError::Core(e));
        }
    };

    runtime.health.record_accepted();

    match runtime.alerting.evaluate_reading(&reading).await {
        Ok(alerts) if !alerts.is_empty() => {
            tracing::info!(count = alerts.len(), "alerts triggered");
            let max_severity = alerts
                .iter()
                .map(|a| a.severity)
                .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
            for alert in &alerts {
                notifications::notify_alert(&app, alert);
            }
            tray::update_severity_icon(&app, max_severity);
        }
        Err(e) => tracing::error!("alert evaluation failed: {e}"),
        _ => {}
    }

    if let Err(e) = runtime.distribution.aggregate_reading(&reading).await {
        tracing::error!("analytics materialization failed: {e}");
    }

    let snapshot = runtime.health.snapshot();
    let latency_ms = request_started_at.elapsed().as_secs_f64() * 1000.0;
    let _ = runtime
        .distribution
        .record_ingestion_health(
            snapshot.total_received,
            snapshot.total_accepted,
            snapshot.total_rejected,
            latency_ms,
        )
        .await;

    runtime.lifecycle.release_request();

    Ok(serde_json::json!({
        "status": "accepted",
        "sensorId": reading.sensor_id,
    }))
}

// --- alerting rules ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleArgs {
    pub metric_type: MetricType,
    pub threshold_value: f64,
    pub comparison: Comparison,
    pub zone: Option<String>,
    pub created_by: Uuid,
}

#[tauri::command]
pub async fn rules_create(
    runtime: State<'_, ScemasRuntime>,
    args: CreateRuleArgs,
) -> Result<ThresholdRule> {
    let rule = runtime
        .alerting
        .create_rule(
            args.metric_type,
            args.threshold_value,
            args.comparison,
            args.zone,
            args.created_by,
        )
        .await?;
    Ok(rule)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditRuleArgs {
    pub rule_id: Uuid,
    pub metric_type: MetricType,
    pub threshold_value: f64,
    pub comparison: Comparison,
    pub zone: Option<String>,
    pub updated_by: Uuid,
}

#[tauri::command]
pub async fn rules_edit(
    runtime: State<'_, ScemasRuntime>,
    args: EditRuleArgs,
) -> Result<ThresholdRule> {
    let rule = runtime
        .alerting
        .edit_rule(
            args.rule_id,
            args.metric_type,
            args.threshold_value,
            args.comparison,
            args.zone,
            args.updated_by,
        )
        .await?;
    Ok(rule)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRuleStatusArgs {
    pub rule_id: Uuid,
    pub rule_status: RuleStatus,
    pub updated_by: Uuid,
}

#[tauri::command]
pub async fn rules_update_status(
    runtime: State<'_, ScemasRuntime>,
    args: UpdateRuleStatusArgs,
) -> Result<serde_json::Value> {
    runtime
        .alerting
        .update_rule_status(args.rule_id, args.rule_status, args.updated_by)
        .await?;
    Ok(serde_json::json!({ "success": true }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRuleArgs {
    pub rule_id: Uuid,
    pub deleted_by: Uuid,
}

#[tauri::command]
pub async fn rules_delete(
    runtime: State<'_, ScemasRuntime>,
    args: DeleteRuleArgs,
) -> Result<serde_json::Value> {
    runtime
        .alerting
        .delete_rule(args.rule_id, args.deleted_by)
        .await?;
    Ok(serde_json::json!({ "success": true }))
}

// --- alerts ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertActorArgs {
    pub alert_id: Uuid,
    pub user_id: Uuid,
}

#[tauri::command]
pub async fn alerts_acknowledge(
    runtime: State<'_, ScemasRuntime>,
    args: AlertActorArgs,
) -> Result<serde_json::Value> {
    runtime
        .alerting
        .acknowledge_alert(args.alert_id, args.user_id)
        .await?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn alerts_resolve(
    runtime: State<'_, ScemasRuntime>,
    args: AlertActorArgs,
) -> Result<serde_json::Value> {
    runtime
        .alerting
        .resolve_alert(args.alert_id, args.user_id)
        .await?;
    Ok(serde_json::json!({ "success": true }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchAlertActorArgs {
    pub ids: Vec<Uuid>,
    pub user_id: Uuid,
}

#[tauri::command]
pub async fn alerts_batch_resolve(
    runtime: State<'_, ScemasRuntime>,
    args: BatchAlertActorArgs,
) -> Result<serde_json::Value> {
    let result = runtime
        .alerting
        .batch_resolve_alerts(args.ids, args.user_id)
        .await?;
    Ok(serde_json::json!({
        "transitioned": result.transitioned,
        "failed": result.failed,
    }))
}

#[tauri::command]
pub async fn alerts_batch_acknowledge(
    runtime: State<'_, ScemasRuntime>,
    args: BatchAlertActorArgs,
) -> Result<serde_json::Value> {
    let result = runtime
        .alerting
        .batch_acknowledge_alerts(args.ids, args.user_id)
        .await?;
    Ok(serde_json::json!({
        "transitioned": result.transitioned,
        "failed": result.failed,
    }))
}

// --- tokens + devices (local) ---

#[tauri::command]
pub async fn tokens_create(
    runtime: State<'_, ScemasRuntime>,
    account_id: String,
    label: String,
    scopes: Vec<String>,
) -> Result<serde_json::Value> {
    let id = Uuid::parse_str(&account_id)
        .map_err(|_| DesktopError::Validation("invalid account_id".to_string()))?;
    let resp = runtime
        .access
        .create_api_token(id, &label, Some(scopes))
        .await?;
    Ok(serde_json::to_value(resp).expect("serializable"))
}

#[tauri::command]
pub async fn health_get(runtime: State<'_, ScemasRuntime>) -> Result<serde_json::Value> {
    let snapshot = runtime.health.snapshot();
    let phase = runtime.lifecycle.phase();
    let drain_stage = runtime.lifecycle.drain_stage();
    Ok(serde_json::json!({
        "counters": snapshot,
        "lifecycle": {
            "phase": phase.to_string(),
            "drainStage": drain_stage.to_string(),
            "inflight": runtime.lifecycle.inflight_count(),
        },
    }))
}

// --- subscriptions ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubscriptionArgs {
    pub user_id: Uuid,
    pub metric_types: Option<Vec<String>>,
    pub zones: Option<Vec<String>>,
    pub min_severity: Option<i32>,
    pub webhook_url: Option<String>,
}

#[tauri::command]
pub async fn subscriptions_update(
    runtime: State<'_, ScemasRuntime>,
    args: UpdateSubscriptionArgs,
) -> Result<serde_json::Value> {
    queries::subscriptions::upsert(
        &runtime.pool,
        args.user_id,
        args.metric_types,
        args.zones,
        args.min_severity,
        args.webhook_url,
    )
    .await?;
    Ok(serde_json::json!({ "success": true }))
}

// --- reports ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitReportArgs {
    pub zone: String,
    pub category: String,
    pub description: String,
    pub contact_email: Option<String>,
    pub reported_by: Option<Uuid>,
}

#[tauri::command]
pub async fn reports_submit(
    runtime: State<'_, ScemasRuntime>,
    args: SubmitReportArgs,
) -> Result<queries::reports::HazardReport> {
    let report = queries::reports::submit(
        &runtime.pool,
        &args.zone,
        &args.category,
        &args.description,
        args.contact_email.as_deref(),
        args.reported_by,
    )
    .await?;
    Ok(report)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReportStatusArgs {
    pub id: Uuid,
    pub status: String,
    pub review_note: Option<String>,
    pub reviewed_by: Option<Uuid>,
}

#[tauri::command]
pub async fn reports_update_status(
    runtime: State<'_, ScemasRuntime>,
    args: UpdateReportStatusArgs,
) -> Result<serde_json::Value> {
    queries::reports::update_status(
        &runtime.pool,
        args.id,
        &args.status,
        args.review_note.as_deref(),
        args.reviewed_by,
    )
    .await?;
    Ok(serde_json::json!({ "success": true }))
}
