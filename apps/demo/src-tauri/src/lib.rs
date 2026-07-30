/// Generated with `node -e`, see .env.local for the private key.
/// Private key: TAURI_PRIVATE_KEY=UAUNOD4GItnVHINy4k/V+ntVHd04ZHIc9IoDDv4xW+U=
/// Regenerate with: `npx @tauri-apps/cli signer generate -w .env.local`
const ZEEP_UPDATER_PUBKEY: &str =
    "f750321bc1d01bd64d6079957eeb4398321362ec6f8341dcd17875c15fdaf2ae";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(zeep_kit::Builder::new().namespace("zeep-demo").build())
        .plugin(zeep_logger::Builder::development().build())
        .plugin(
            zeep_updater::Builder::new()
                .pubkey(ZEEP_UPDATER_PUBKEY)
                .build(),
        )
        .plugin(zeep_ai::Builder::build())
        .setup(|app| {
            if let Err(err) = zeep_logger::cleanup_old_logs(app.handle(), 14) {
                eprintln!("zeep-logger: failed to clean up old logs: {err}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
