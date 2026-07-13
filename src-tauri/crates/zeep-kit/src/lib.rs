use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{Manager, Runtime};

use zeep_core::keychain::{Keychain, KeychainState};
use zeep_core::prefs::{PrefsState, PrefsStore};
use zeep_core::shell::{ShellRunner, ShellState};

pub use zeep_core;

pub struct Builder {
    namespace: Option<String>,
    shell_cwd: Option<PathBuf>,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            namespace: None,
            shell_cwd: None,
        }
    }

    pub fn namespace(mut self, ns: impl Into<String>) -> Self {
        self.namespace = Some(ns.into());
        self
    }

    pub fn shell_cwd(mut self, cwd: PathBuf) -> Self {
        self.shell_cwd = Some(cwd);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        let namespace = self.namespace.unwrap_or_else(|| "zeep-app".into());
        let keychain_service = resolve_keychain_service(&namespace);
        let shell_cwd = self.shell_cwd;

        PluginBuilder::<R>::new("zeep-kit")
            .setup(move |app, _api| {
                let app_data_dir = app.path().app_data_dir()?;

                let prefs: PrefsState =
                    Arc::new(RwLock::new(PrefsStore::new(&namespace, app_data_dir)));
                app.manage(prefs);

                let keychain: KeychainState =
                    Arc::new(RwLock::new(Keychain::new(&keychain_service)));
                app.manage(keychain);

                let cwd = shell_cwd.clone().unwrap_or_else(|| {
                    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                });
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
            .build()
    }
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_keychain_service(namespace: &str) -> String {
    format!("dev.zeep.{namespace}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::plugin::Plugin as _;

    #[test]
    fn derives_service_from_namespace() {
        assert_eq!(resolve_keychain_service("zeep-demo"), "dev.zeep.zeep-demo");
    }

    #[test]
    fn derives_service_from_custom_namespace() {
        assert_eq!(resolve_keychain_service("acme-app"), "dev.zeep.acme-app");
    }

    #[test]
    fn build_returns_plugin_named_zeep_kit() {
        let plugin = Builder::new()
            .namespace("test-app")
            .build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "zeep-kit");
    }
}
