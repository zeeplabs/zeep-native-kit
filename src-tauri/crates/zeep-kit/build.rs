const COMMANDS: &[&str] = &[
    "prefs_get",
    "prefs_set",
    "prefs_delete",
    "prefs_get_all",
    "keychain_get",
    "keychain_set",
    "keychain_delete",
    "shell_which",
    "shell_run",
    "shell_run_stream",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
