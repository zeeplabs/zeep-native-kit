fn main() {
    tauri_plugin::Builder::new(&[
        "ai_detect_providers",
        "ai_run",
        "ai_run_stream",
        "ai_cancel",
    ])
    .build();
}
