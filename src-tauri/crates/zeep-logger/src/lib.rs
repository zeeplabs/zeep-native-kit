use std::fmt::Arguments;
use std::io;
use std::path::Path;
use std::time::{Duration, SystemTime};
use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_log::fern::FormatCallback;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

fn build_json_line(level: log::Level, target: &str, message: &Arguments<'_>) -> String {
    let timestamp = time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default();

    serde_json::json!({
        "timestamp": timestamp,
        "level": level.to_string(),
        "target": target,
        "message": message.to_string(),
    })
    .to_string()
}

fn json_line_formatter(out: FormatCallback<'_>, message: &Arguments<'_>, record: &log::Record<'_>) {
    let line = build_json_line(record.level(), record.target(), message);
    out.finish(format_args!("{line}"));
}

pub struct Builder {
    inner: tauri_plugin_log::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_log::Builder::new().format(json_line_formatter),
        }
    }

    pub fn development() -> Self {
        Self::new()
            .level(log::LevelFilter::Debug)
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Webview),
            ])
    }

    pub fn production() -> Self {
        Self::new()
            .level(log::LevelFilter::Info)
            .targets([Target::new(TargetKind::LogDir { file_name: None })])
            .max_file_size(10_000_000)
            .rotation_strategy(RotationStrategy::KeepAll)
    }

    pub fn level(mut self, level: log::LevelFilter) -> Self {
        self.inner = self.inner.level(level);
        self
    }

    pub fn targets(mut self, targets: impl IntoIterator<Item = Target>) -> Self {
        self.inner = self.inner.targets(targets);
        self
    }

    pub fn max_file_size(mut self, bytes: u128) -> Self {
        self.inner = self.inner.max_file_size(bytes);
        self
    }

    pub fn rotation_strategy(mut self, strategy: RotationStrategy) -> Self {
        self.inner = self.inner.rotation_strategy(strategy);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        self.inner.build()
    }
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

fn remove_stale_files(dir: &Path, days: u64) -> io::Result<()> {
    let cutoff = SystemTime::now() - Duration::from_secs(days * 86_400);

    let read_dir = match std::fs::read_dir(dir) {
        Ok(read_dir) => read_dir,
        Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(err) => return Err(err),
    };

    for entry in read_dir {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_file() && metadata.modified()? < cutoff {
            std::fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}

pub fn cleanup_old_logs<R: Runtime>(app: &AppHandle<R>, days: u64) -> io::Result<()> {
    let log_dir = app.path().app_log_dir().map_err(io::Error::other)?;
    remove_stale_files(&log_dir, days)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::plugin::Plugin as _;

    #[test]
    fn development_preset_builds_a_plugin() {
        let plugin = Builder::development().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "log");
    }

    #[test]
    fn production_preset_builds_a_plugin() {
        let plugin = Builder::production().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "log");
    }

    #[test]
    fn json_formatter_produces_valid_json_with_expected_fields() {
        let message = format_args!("hello world");
        let line = build_json_line(log::Level::Info, "zeep_logger::tests", &message);

        let parsed: serde_json::Value = serde_json::from_str(&line).expect("valid json line");
        assert_eq!(parsed["level"], "INFO");
        assert_eq!(parsed["target"], "zeep_logger::tests");
        assert_eq!(parsed["message"], "hello world");
        assert!(parsed["timestamp"].is_string());
    }

    #[test]
    fn cleanup_removes_files_older_than_cutoff_and_keeps_newer_ones() {
        use std::time::{Duration, SystemTime};

        let dir = tempfile::tempdir().expect("tempdir");
        let old_file = dir.path().join("old.log");
        let new_file = dir.path().join("new.log");
        std::fs::write(&old_file, "old").unwrap();
        std::fs::write(&new_file, "new").unwrap();

        let ten_days_ago = SystemTime::now() - Duration::from_secs(10 * 86_400);
        let old_time = filetime::FileTime::from_system_time(ten_days_ago);
        filetime::set_file_mtime(&old_file, old_time).unwrap();

        remove_stale_files(dir.path(), 5).unwrap();

        assert!(!old_file.exists());
        assert!(new_file.exists());
    }

    #[test]
    fn cleanup_on_missing_directory_is_a_no_op() {
        let dir = tempfile::tempdir().expect("tempdir");
        let missing_dir = dir.path().join("does-not-exist");

        let result = remove_stale_files(&missing_dir, 5);

        assert!(result.is_ok());
    }
}
