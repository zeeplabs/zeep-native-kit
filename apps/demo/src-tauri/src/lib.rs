use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use tauri::Manager;
use zeep_core::keychain::{Keychain, KeychainState};
use zeep_core::prefs::{PrefsState, PrefsStore};
use zeep_core::shell::{ShellRunner, ShellState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;

            let prefs: PrefsState =
                Arc::new(RwLock::new(PrefsStore::new("zeep-demo", app_data_dir)));
            app.manage(prefs);

            let keychain: KeychainState =
                Arc::new(RwLock::new(Keychain::new("dev.zeep.demo")));
            app.manage(keychain);

            let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            let shell: ShellState = Arc::new(RwLock::new(ShellRunner::new(cwd)));
            app.manage(shell);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            zeep_core::prefs::prefs_get,
            zeep_core::prefs::prefs_set,
            zeep_core::prefs::prefs_delete,
            zeep_core::prefs::prefs_get_all,
            zeep_core::keychain::keychain_get,
            zeep_core::keychain::keychain_set,
            zeep_core::keychain::keychain_delete,
            zeep_core::shell::shell_which,
            zeep_core::shell::shell_run,
            zeep_core::shell::shell_run_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
