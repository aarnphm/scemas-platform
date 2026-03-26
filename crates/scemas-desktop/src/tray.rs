use scemas_core::models::Severity;
use tauri::{
    AppHandle, Manager, Runtime,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
};

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<TrayIcon<R>, tauri::Error> {
    let show = MenuItem::with_id(app, "show", "Show SCEMAS", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &settings, &quit])?;

    let tray = TrayIconBuilder::with_id("scemas-tray")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("SCEMAS - Environmental Monitoring")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "settings" => {
                show_main_window(app);
                // navigate to settings (TanStack Router uses browser history)
                if let Some(window) = find_main_window(app) {
                    let _ = window.eval("window.history.pushState({}, '', '/settings')");
                    let _ = window.eval("window.dispatchEvent(new PopStateEvent('popstate'))");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(tray)
}

/// find the main window (tauri 2.x default label is "main")
fn find_main_window<R: Runtime>(app: &AppHandle<R>) -> Option<tauri::WebviewWindow<R>> {
    app.get_webview_window("main")
}

/// show + focus + unminimize the main window
fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = find_main_window(app) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn update_severity_icon<R: Runtime>(app: &AppHandle<R>, max_severity: Option<Severity>) {
    let (r, g, b) = match max_severity {
        Some(Severity::Critical) => (0xdcu8, 0x26u8, 0x26u8),
        Some(Severity::Warning) => (0xd9u8, 0x77u8, 0x06u8),
        Some(Severity::Low) | None => (0x16u8, 0xa3u8, 0x4au8),
    };

    let size = 16usize;
    let mut rgba = Vec::with_capacity(size * size * 4);
    for _ in 0..(size * size) {
        rgba.extend_from_slice(&[r, g, b, 255]);
    }

    let icon = Image::new_owned(rgba, size as u32, size as u32);
    if let Some(tray) = app.tray_by_id("scemas-tray") {
        let _ = tray.set_icon(Some(icon));
    }
}
