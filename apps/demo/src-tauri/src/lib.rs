#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
