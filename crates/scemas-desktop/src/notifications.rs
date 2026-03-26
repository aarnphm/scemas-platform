use scemas_core::models::{Alert, Severity};
use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

/// send a native OS notification for an alert.
pub fn notify_alert<R: Runtime>(app: &AppHandle<R>, alert: &Alert) {
    let title = match alert.severity {
        Severity::Critical => "CRITICAL Alert",
        Severity::Warning => "Warning Alert",
        Severity::Low => "Low Alert",
    };

    let body = format!(
        "{} in zone {} ({})",
        alert.metric_type, alert.zone, alert.severity
    );

    if let Err(e) = app.notification().builder().title(title).body(&body).show() {
        tracing::warn!("failed to send notification: {e}");
    }
}
