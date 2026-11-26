//! Issue #14: a `Builder::redactor` hook must run before a log entry reaches ANY
//! sink (webview event, file, ...), so secrets never leave the process in clear.
//!
//! Own test binary because the plugin installs a process-wide logger
//! (`log::set_boxed_logger`), which can only happen once per process.

use std::sync::mpsc;
use std::time::Duration;

use tauri::test::{mock_builder, mock_context, noop_assets};
use tauri::Listener;
use zeep_logger::{Builder, LogTarget};

const SECRET: &str = "hunter2";

#[test]
fn redactor_runs_before_every_sink() {
    let dir = tempfile::tempdir().expect("tempdir");

    let plugin = Builder::new()
        .level(log::LevelFilter::Debug)
        .targets([
            LogTarget::Webview,
            LogTarget::Folder(dir.path().to_path_buf(), Some("redactor-test".into())),
        ])
        .redactor(|entry| {
            entry.message = entry.message.replace(SECRET, "[REDACTED]");
        })
        .build();

    let app = mock_builder()
        .plugin(plugin)
        .build(mock_context(noop_assets()))
        .expect("plugin setup");

    let (tx, rx) = mpsc::channel::<String>();
    app.listen("log://log", move |event| {
        let _ = tx.send(event.payload().to_string());
    });

    log::info!("login ok password={SECRET}");

    // Webview sink.
    let payload = rx
        .recv_timeout(Duration::from_secs(5))
        .expect("entry was not forwarded to the webview");
    assert!(!payload.contains(SECRET), "secret leaked to webview: {payload}");
    assert!(payload.contains("password=[REDACTED]"), "unexpected payload: {payload}");

    // File sink (the write is synchronous inside `log::info!`).
    let file = std::fs::read_to_string(dir.path().join("redactor-test.log")).expect("log file");
    assert!(!file.contains(SECRET), "secret leaked to file: {file}");
    assert!(file.contains("password=[REDACTED]"), "unexpected file: {file}");
}
