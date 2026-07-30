use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{Manager, Runtime};

use zeep_core::keychain::{Keychain, KeychainState};
use zeep_core::prefs::{PrefsState, PrefsStore};
use zeep_core::shell::{ShellRunner, ShellState};

pub use zeep_core;

enum LogConfig {
    Dev,
    Prod,
}

pub struct Builder {
    namespace: Option<String>,
    shell_cwd: Option<PathBuf>,
    log_config: Option<LogConfig>,
    updater_pubkey: Option<String>,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            namespace: None,
            shell_cwd: None,
            log_config: None,
            updater_pubkey: None,
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

    /// Enable the logger with the development preset (stdout + webview, Debug level).
    pub fn log_dev(mut self) -> Self {
        self.log_config = Some(LogConfig::Dev);
        self
    }

    /// Enable the logger with the production preset (file rotation, Info level).
    pub fn log_prod(mut self) -> Self {
        self.log_config = Some(LogConfig::Prod);
        self
    }

    /// Enable the auto-updater with the given signing public key.
    pub fn updater(mut self, pubkey: impl Into<String>) -> Self {
        self.updater_pubkey = Some(pubkey.into());
        self
    }

    /// Build the core plugin (prefs + keychain + shell).
    /// For registering just the core modules with `.plugin()`.  
    /// For registering ALL modules in one call, use [`Builder::install`].
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

    /// Register all plugins into a `tauri::Builder` and return it.
    ///
    /// Registers: core (prefs/keychain/shell), optionally logger + updater + AI.
    /// The consumer still needs to call `.run(tauri::generate_context!())`.
    ///
    /// ```no_run
    /// zeep_kit::Builder::new()
    ///     .namespace("dev.myapp")
    ///     .log_dev()
    ///     .updater("public-key-hex")
    ///     .install(tauri::Builder::default());
    /// ```
    pub fn install<R: Runtime>(self, mut builder: tauri::Builder<R>) -> tauri::Builder<R> {
        let Builder { namespace, shell_cwd, log_config, updater_pubkey } = self;

        let core_plugin = {
            let ns = namespace.unwrap_or_else(|| "zeep-app".into());
            let keychain_service = resolve_keychain_service(&ns);
            let cwd = shell_cwd;

            PluginBuilder::<R>::new("zeep-kit")
                .setup(move |app, _api| {
                    let app_data_dir = app.path().app_data_dir()?;

                    let prefs: PrefsState =
                        Arc::new(RwLock::new(PrefsStore::new(&ns, app_data_dir)));
                    app.manage(prefs);

                    let keychain: KeychainState =
                        Arc::new(RwLock::new(Keychain::new(&keychain_service)));
                    app.manage(keychain);

                    let shell_cwd = cwd.clone().unwrap_or_else(|| {
                        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
                    });
                    let shell: ShellState =
                        Arc::new(RwLock::new(ShellRunner::new(shell_cwd)));
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
        };

        builder = builder.plugin(core_plugin);

        if let Some(config) = log_config {
            let plugin = match config {
                LogConfig::Dev => zeep_logger::Builder::development().build(),
                LogConfig::Prod => zeep_logger::Builder::production().build(),
            };
            builder = builder.plugin(plugin);
        }

        if let Some(pubkey) = updater_pubkey {
            let plugin = zeep_updater::Builder::new().pubkey(pubkey).build();
            builder = builder.plugin(plugin);
        }

        builder.plugin(zeep_ai::Builder::build())
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
