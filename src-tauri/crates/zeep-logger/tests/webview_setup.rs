//! Regression test for issues #11 and #12: `LogTarget::Webview` spawned its forwarding
//! task with `tokio::spawn` inside the plugin `setup`, which Tauri runs outside
//! any Tokio runtime, so the app panicked at startup with
//! "there is no reactor running".
//!
//! Lives in its own test binary because the plugin installs a process-wide
//! logger (`log::set_boxed_logger`), which can only happen once per process.

use std::sync::mpsc;
use std::time::Duration;

use tauri::test::{mock_builder, mock_context, noop_assets};
use tauri::Listener;
use zeep_logger::Builder;

#[test]
fn webview_target_sets_up_outside_a_tokio_runtime_and_forwards_logs() {
    // Plain `#[test]`: no Tokio runtime on this thread, same as Tauri's setup.
    let app = mock_builder()
        .plugin(Builder::development().build())
        .build(mock_context(noop_assets()))
        .expect("plugin setup must not panic or fail with a Webview target");

    let (tx, rx) = mpsc::channel::<String>();
    app.listen("log://log", move |event| {
        let _ = tx.send(event.payload().to_string());
    });

    // Issue #12: `development()` is Debug, so the global max level must be Debug
    // (it used to be read back with the wrong numbering and end up as Warn).
    assert_eq!(log::max_level(), log::LevelFilter::Debug);

    log::info!("issue-11-probe");

    let payload = rx
        .recv_timeout(Duration::from_secs(5))
        .expect("log entry was not forwarded to the webview event");
    assert!(
        payload.contains("issue-11-probe"),
        "unexpected payload: {payload}"
    );
}
