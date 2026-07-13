#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
        .plugin(zeep_logger::Builder::development().build())
        .setup(|app| {
            if let Err(err) = zeep_logger::cleanup_old_logs(app.handle(), 14) {
                eprintln!("zeep-logger: failed to clean up old logs: {err}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
