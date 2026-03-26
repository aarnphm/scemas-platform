use scemas_core::regions::zone_filter_matches;
use scemas_server::ScemasRuntime;
use tauri::State;

use crate::error::DesktopError;
use crate::queries;

type Result<T> = std::result::Result<T, DesktopError>;

// helper: expand a zone input into matching canonical zone ids.
// uses zone_filter_matches against all known canonical zones.
fn expand_zones(zone: &str) -> Vec<String> {
    if zone.is_empty() || zone == "all" {
        return scemas_core::regions::CANONICAL_REGION_IDS
            .iter()
            .map(|s| (*s).to_string())
            .collect();
    }
    scemas_core::regions::CANONICAL_REGION_IDS
        .iter()
        .filter(|canonical| zone_filter_matches(zone, canonical, None))
        .map(|s| (*s).to_string())
        .collect()
}

// --- telemetry reads ---

#[tauri::command]
pub async fn telemetry_get_by_zone(
    runtime: State<'_, ScemasRuntime>,
    zone: String,
    metric_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<queries::telemetry::SensorReading>> {
    let zones = expand_zones(&zone);
    let pool = &runtime.pool;
    let rows =
        queries::telemetry::get_by_zone(pool, &zones, metric_type.as_deref(), limit.unwrap_or(100))
            .await?;
    Ok(rows)
}

#[tauri::command]
pub async fn telemetry_get_latest(
    runtime: State<'_, ScemasRuntime>,
    limit: Option<i64>,
) -> Result<Vec<queries::telemetry::SensorReading>> {
    let rows = queries::telemetry::get_latest(&runtime.pool, limit.unwrap_or(200)).await?;
    Ok(rows)
}

#[tauri::command]
pub async fn telemetry_time_series(
    runtime: State<'_, ScemasRuntime>,
    zone: Option<String>,
    hours: Option<i32>,
) -> Result<Vec<queries::telemetry::TimeSeriesPoint>> {
    let zones = expand_zones(zone.as_deref().unwrap_or("all"));
    let rows =
        queries::telemetry::get_time_series(&runtime.pool, &zones, hours.unwrap_or(6)).await?;
    Ok(rows)
}

// --- alerts reads ---

#[tauri::command]
pub async fn alerts_list(
    runtime: State<'_, ScemasRuntime>,
    status: Option<String>,
    zone: Option<String>,
    hours: Option<i32>,
    limit: Option<i64>,
    cursor: Option<String>,
) -> Result<queries::alerts::CursorPage<queries::alerts::Alert>> {
    let cursor_dt = cursor
        .as_deref()
        .map(|s| chrono::DateTime::parse_from_rfc3339(s).map(|dt| dt.with_timezone(&chrono::Utc)))
        .transpose()
        .map_err(|e| DesktopError::Validation(format!("invalid cursor: {e}")))?;

    let page = queries::alerts::list(
        &runtime.pool,
        status.as_deref(),
        zone.as_deref(),
        hours,
        limit.unwrap_or(100),
        cursor_dt,
    )
    .await?;
    Ok(page)
}

#[tauri::command]
pub async fn alerts_get(
    runtime: State<'_, ScemasRuntime>,
    id: String,
) -> Result<Option<queries::alerts::Alert>> {
    let uuid = uuid::Uuid::parse_str(&id)
        .map_err(|_| DesktopError::Validation("invalid uuid".to_string()))?;
    Ok(queries::alerts::get(&runtime.pool, uuid).await?)
}

#[tauri::command]
pub async fn alerts_count(runtime: State<'_, ScemasRuntime>, zone: Option<String>) -> Result<i64> {
    Ok(queries::alerts::count(&runtime.pool, zone.as_deref()).await?)
}

#[tauri::command]
pub async fn alerts_frequency(
    runtime: State<'_, ScemasRuntime>,
    hours: Option<i32>,
) -> Result<Vec<queries::alerts::AlertFrequency>> {
    Ok(queries::alerts::frequency(&runtime.pool, hours.unwrap_or(24)).await?)
}

// --- rules read ---

#[tauri::command]
pub async fn rules_list(runtime: State<'_, ScemasRuntime>) -> Result<Vec<queries::rules::Rule>> {
    Ok(queries::rules::list(&runtime.pool).await?)
}

// --- users reads ---

#[tauri::command]
pub async fn users_list(
    runtime: State<'_, ScemasRuntime>,
) -> Result<Vec<queries::users::UserInfo>> {
    Ok(queries::users::list(&runtime.pool).await?)
}

#[tauri::command]
pub async fn users_get(
    runtime: State<'_, ScemasRuntime>,
    id: String,
) -> Result<Option<queries::users::UserInfo>> {
    let uuid = uuid::Uuid::parse_str(&id)
        .map_err(|_| DesktopError::Validation("invalid uuid".to_string()))?;
    Ok(queries::users::get(&runtime.pool, uuid).await?)
}

#[tauri::command]
pub async fn users_active_sessions(
    runtime: State<'_, ScemasRuntime>,
) -> Result<Vec<queries::users::ActiveSession>> {
    Ok(queries::users::active_sessions(&runtime.pool).await?)
}

// --- devices reads ---

#[tauri::command]
pub async fn devices_list(
    runtime: State<'_, ScemasRuntime>,
) -> Result<Vec<queries::devices::Device>> {
    Ok(queries::devices::list(&runtime.pool).await?)
}

#[tauri::command]
pub async fn devices_get(
    runtime: State<'_, ScemasRuntime>,
    device_id: String,
) -> Result<Option<queries::devices::Device>> {
    Ok(queries::devices::get(&runtime.pool, &device_id).await?)
}

// --- audit reads ---

#[tauri::command]
pub async fn audit_list(
    runtime: State<'_, ScemasRuntime>,
    limit: Option<i64>,
    cursor: Option<i64>,
) -> Result<queries::alerts::CursorPage<queries::audit::AuditLog>> {
    Ok(queries::audit::list(&runtime.pool, limit.unwrap_or(100), cursor).await?)
}

#[tauri::command]
pub async fn audit_count(runtime: State<'_, ScemasRuntime>) -> Result<i64> {
    Ok(queries::audit::count(&runtime.pool).await?)
}

#[tauri::command]
pub async fn audit_frequency(
    runtime: State<'_, ScemasRuntime>,
    hours: Option<i32>,
) -> Result<Vec<queries::audit::AuditFrequency>> {
    Ok(queries::audit::frequency(&runtime.pool, hours.unwrap_or(24)).await?)
}

// --- health reads ---

#[tauri::command]
pub async fn health_status(
    runtime: State<'_, ScemasRuntime>,
    limit: Option<i64>,
) -> Result<Vec<queries::health::PlatformStatusRow>> {
    Ok(queries::health::status(&runtime.pool, limit.unwrap_or(10)).await?)
}

#[tauri::command]
pub async fn ingestion_failures_list(
    runtime: State<'_, ScemasRuntime>,
    limit: Option<i64>,
) -> Result<Vec<queries::health::IngestionFailure>> {
    Ok(queries::health::ingestion_failures(&runtime.pool, limit.unwrap_or(50)).await?)
}

// --- subscriptions reads ---

#[tauri::command]
pub async fn subscriptions_get(
    runtime: State<'_, ScemasRuntime>,
    user_id: String,
) -> Result<Option<queries::subscriptions::Subscription>> {
    let uuid = uuid::Uuid::parse_str(&user_id)
        .map_err(|_| DesktopError::Validation("invalid uuid".to_string()))?;
    Ok(queries::subscriptions::get(&runtime.pool, uuid).await?)
}

// --- reports reads ---

#[tauri::command]
pub async fn reports_list(
    runtime: State<'_, ScemasRuntime>,
    status: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<queries::reports::HazardReport>> {
    Ok(queries::reports::list(&runtime.pool, status.as_deref(), limit.unwrap_or(100)).await?)
}

// --- public/DDM reads ---

#[tauri::command]
pub async fn public_zone_summary(
    runtime: State<'_, ScemasRuntime>,
) -> Result<Vec<queries::public::ZoneSummary>> {
    Ok(queries::public::zone_summary(&runtime.pool, "5m_avg").await?)
}

#[tauri::command]
pub async fn public_feed_status(
    runtime: State<'_, ScemasRuntime>,
) -> Result<Vec<queries::public::FeedStatusEntry>> {
    Ok(queries::public::feed_status(&runtime.pool, "5m_avg").await?)
}

#[tauri::command]
pub async fn public_zone_history(
    runtime: State<'_, ScemasRuntime>,
    zone: String,
    metric_type: String,
    bucket: Option<String>,
    window_hours: Option<i32>,
) -> Result<Vec<queries::public::ZoneHistoryPoint>> {
    let zones = expand_zones(&zone);
    Ok(queries::public::zone_history(
        &runtime.pool,
        &zones,
        &metric_type,
        bucket.as_deref().unwrap_or("5m_avg"),
        window_hours.unwrap_or(6),
    )
    .await?)
}
