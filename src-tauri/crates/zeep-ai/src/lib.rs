mod adapter;
mod detector;
mod runner;

use std::sync::Arc;
use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{AppHandle, Manager, Runtime};
use zeep_core::prefs::PrefsState;

use adapter::{get_adapter, RunOpts};
use detector::DetectedProvider;
use runner::AIRunner;

const PREFS_KEY_PROVIDERS: &str = "zeep_ai.providers";

#[derive(Default)]
pub struct Builder;

impl Builder {
    pub fn new() -> Self { Self }

    pub fn build<R: Runtime>() -> TauriPlugin<R> {
        PluginBuilder::<R>::new("zeep-ai")
            .setup(|app, _api| {
                let runner = Arc::new(AIRunner::new());
                app.manage(runner);
                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                ai_detect_providers,
                ai_run,
                ai_run_stream,
                ai_cancel,
            ])
            .build()
    }
}

#[tauri::command]
async fn ai_detect_providers(prefs: tauri::State<'_, PrefsState>) -> Result<Vec<DetectedProvider>, String> {
    let providers = detector::detect();

    if let Ok(json) = serde_json::to_value(&providers) {
        if let Ok(prefs) = prefs.write() {
            let _ = prefs.set(PREFS_KEY_PROVIDERS, json);
        }
    }

    Ok(providers)
}

#[tauri::command]
async fn ai_run<R: Runtime>(
    app: AppHandle<R>,
    provider: String,
    prompt: String,
    model: Option<String>,
    max_tokens: Option<u32>,
    system: Option<String>,
) -> Result<String, String> {
    let adapter = get_adapter(&provider).ok_or_else(|| format!("unknown provider: {provider}"))?;
    let opts = RunOpts { model, max_tokens, system };
    let binary = get_binary(&app, &provider)?;
    let args = adapter.build_args(&opts);
    let runner = app.state::<Arc<AIRunner>>();
    runner.run_blocking(&binary, &args, &prompt).await
}

#[tauri::command]
async fn ai_run_stream<R: Runtime>(
    app: AppHandle<R>,
    provider: String,
    prompt: String,
    model: Option<String>,
    max_tokens: Option<u32>,
    system: Option<String>,
) -> Result<u64, String> {
    let adapter = get_adapter(&provider).ok_or_else(|| format!("unknown provider: {provider}"))?;
    let opts = RunOpts { model, max_tokens, system };
    let binary = get_binary(&app, &provider)?;
    let args = adapter.build_args(&opts);
    let app_clone = app.clone();
    let runner = app_clone.state::<Arc<AIRunner>>();
    runner.run_stream(&binary, &args, &prompt, app).await
}

#[tauri::command]
async fn ai_cancel<R: Runtime>(
    app: AppHandle<R>,
    run_id: u64,
) -> Result<(), String> {
    let runner = app.state::<Arc<AIRunner>>();
    runner.cancel(run_id)
}

fn get_binary<R: Runtime>(app: &AppHandle<R>, provider: &str) -> Result<String, String> {
    let prefs = app.state::<PrefsState>();
    let reader = prefs.read().map_err(|e| e.to_string())?;
    let providers: Vec<DetectedProvider> = reader
        .get::<serde_json::Value>(PREFS_KEY_PROVIDERS)
        .map_err(|e| e.to_string())?
        .and_then(|v| serde_json::from_value::<Vec<DetectedProvider>>(v).ok())
        .ok_or_else(|| "providers not detected. Call ai_detect_providers first".to_string())?;
    providers.into_iter()
        .find(|p| p.name == provider)
        .map(|p| p.binary)
        .ok_or_else(|| format!("provider {provider} not found"))
}
