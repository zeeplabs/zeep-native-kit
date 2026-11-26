use std::collections::VecDeque;
use std::fmt::Arguments;
use std::io::{self, Write};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

use serde::Serialize;
use tauri::plugin::{Builder as PluginBuilder, TauriPlugin};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_log::fern;
use tauri_plugin_log::RotationStrategy;

use std::fs::OpenOptions;

const RING_CAPACITY: usize = 1000;

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub target: String,
    pub message: String,
}

#[derive(Debug, Clone)]
pub enum LogTarget {
    Stdout,
    Stderr,
    LogDir(Option<String>),
    Folder(PathBuf, Option<String>),
    Webview,
}

struct RingState(Arc<RwLock<VecDeque<LogEntry>>>);
/// Numeric level codes shared with the frontend (`LOG_LEVEL_VALUES` in
/// `@zeeptech/logger`) and `logger_set_level`: Trace=1 .. Error=5. `0` is `Off`
/// and is only used internally. This is deliberately NOT `LevelFilter as u8`,
/// which is numbered the other way around (Error=1 .. Trace=5).
fn level_to_code(level: log::LevelFilter) -> u8 {
    match level {
        log::LevelFilter::Off => 0,
        log::LevelFilter::Trace => 1,
        log::LevelFilter::Debug => 2,
        log::LevelFilter::Info => 3,
        log::LevelFilter::Warn => 4,
        log::LevelFilter::Error => 5,
    }
}

fn code_to_level(code: u8) -> Option<log::LevelFilter> {
    match code {
        0 => Some(log::LevelFilter::Off),
        1 => Some(log::LevelFilter::Trace),
        2 => Some(log::LevelFilter::Debug),
        3 => Some(log::LevelFilter::Info),
        4 => Some(log::LevelFilter::Warn),
        5 => Some(log::LevelFilter::Error),
        _ => None,
    }
}

struct LevelState(Arc<AtomicU8>);

fn build_json_entry(level: log::Level, target: &str, message: &Arguments<'_>) -> LogEntry {
    let timestamp = time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default();

    LogEntry {
        timestamp,
        level: level.to_string(),
        target: target.to_string(),
        message: message.to_string(),
    }
}

/// Hook that can rewrite a [`LogEntry`] before it reaches any sink.
type Redactor = Arc<dyn Fn(&mut LogEntry) + Send + Sync + 'static>;

/// What is logged instead of the original message when the redactor panics.
const REDACTOR_PANIC_MESSAGE: &str = "[log message withheld: redactor panicked]";

/// Runs the redactor, if any. Fails closed: if the redactor panics, the message
/// is replaced rather than falling back to the (possibly sensitive) original.
fn apply_redactor(redactor: Option<&Redactor>, mut entry: LogEntry) -> LogEntry {
    if let Some(redact) = redactor {
        if catch_unwind(AssertUnwindSafe(|| redact(&mut entry))).is_err() {
            entry.message = REDACTOR_PANIC_MESSAGE.to_string();
        }
    }
    entry
}

struct RotatingFile {
    dir: PathBuf,
    file_name: String,
    max_size: u64,
    rotation_strategy: RotationStrategy,
    file: Option<std::fs::File>,
    current_path: PathBuf,
}

impl RotatingFile {
    fn new(
        dir: PathBuf,
        file_name: String,
        max_size: u64,
        rotation_strategy: RotationStrategy,
    ) -> io::Result<Self> {
        if !dir.exists() {
            std::fs::create_dir_all(&dir)?;
        }
        let current_path = dir.join(&file_name).with_extension("log");
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&current_path)?;

        Ok(Self {
            dir,
            file_name,
            max_size,
            rotation_strategy,
            file: Some(file),
            current_path,
        })
    }

    fn rotate(&mut self) -> io::Result<()> {
        if let Some(mut f) = self.file.take() {
            let _ = f.flush();
        }
        if self.current_path.exists() {
            match self.rotation_strategy {
                RotationStrategy::KeepAll => {
                    let ts = time::OffsetDateTime::now_utc()
                        .format(&time::format_description::well_known::Rfc3339)
                        .unwrap_or_default()
                        .replace(':', "-");
                    let rotated = self
                        .dir
                        .join(format!("{}_{}.log", self.file_name, ts));
                    std::fs::rename(&self.current_path, &rotated)?;
                }
                RotationStrategy::KeepOne => {
                    std::fs::remove_file(&self.current_path)?;
                }
                RotationStrategy::KeepSome(n) => {
                    let ts = time::OffsetDateTime::now_utc()
                        .format(&time::format_description::well_known::Rfc3339)
                        .unwrap_or_default()
                        .replace(':', "-");
                    let rotated = self
                        .dir
                        .join(format!("{}_{}.log", self.file_name, ts));
                    std::fs::rename(&self.current_path, &rotated)?;
                    let _ = remove_old_files(&self.dir, &self.file_name, n.saturating_sub(1));
                }
            }
        }
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.current_path)?;
        self.file = Some(file);
        Ok(())
    }
}

fn remove_old_files(dir: &Path, base_name: &str, keep: usize) -> io::Result<()> {
    if let Ok(entries) = std::fs::read_dir(dir) {
        let mut rotated: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| {
                        n.starts_with(base_name)
                            && n.ends_with(".log")
                            && n != format!("{base_name}.log")
                    })
                    .unwrap_or(false)
            })
            .collect();
        rotated.sort_by_key(|e| e.path());
        let remove_count = rotated.len().saturating_sub(keep);
        for entry in rotated.into_iter().take(remove_count) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
    Ok(())
}

impl Write for RotatingFile {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if self.file.is_none() {
            let f = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.current_path)?;
            self.file = Some(f);
        }
        let file = self.file.as_mut().unwrap();

        let metadata = file.metadata()?;
        let current_size = metadata.len();
        if current_size + buf.len() as u64 > self.max_size && current_size > 0 {
            self.rotate()?;
            return self.write(buf);
        }

        file.write_all(buf)?;
        file.flush()?;
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        if let Some(ref mut f) = self.file {
            f.flush()
        } else {
            Ok(())
        }
    }
}

pub struct Builder {
    level: log::LevelFilter,
    targets: Vec<LogTarget>,
    max_file_size: u128,
    rotation_strategy: RotationStrategy,
    redactor: Option<Redactor>,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            level: log::LevelFilter::Trace,
            targets: vec![LogTarget::Stdout, LogTarget::LogDir(None)],
            max_file_size: 10_000_000,
            rotation_strategy: RotationStrategy::KeepOne,
            redactor: None,
        }
    }

    pub fn development() -> Self {
        Self::new()
            .level(log::LevelFilter::Debug)
            .targets([LogTarget::Stdout, LogTarget::Webview])
    }

    pub fn production() -> Self {
        Self::new()
            .level(log::LevelFilter::Info)
            .targets([LogTarget::LogDir(None)])
            .max_file_size(10_000_000)
            .rotation_strategy(RotationStrategy::KeepAll)
    }

    pub fn level(mut self, level_filter: impl Into<log::LevelFilter>) -> Self {
        self.level = level_filter.into();
        self
    }

    pub fn targets(mut self, targets: impl IntoIterator<Item = LogTarget>) -> Self {
        self.targets = targets.into_iter().collect();
        self
    }

    pub fn max_file_size(mut self, bytes: u128) -> Self {
        self.max_file_size = bytes;
        self
    }

    pub fn rotation_strategy(mut self, strategy: RotationStrategy) -> Self {
        self.rotation_strategy = strategy;
        self
    }

    /// Rewrite every log entry before it reaches any output (ring buffer, the
    /// `log://log` webview event, stdout/stderr and files), e.g. to mask tokens or
    /// credentials.
    ///
    /// The hook runs on the thread that logs, for every entry that passes the level
    /// filter, so keep it fast. Change `message` (and `target` if needed); changing
    /// `level` to something other than the usual level names breaks the
    /// `LogViewer` filters. If the hook panics the message is replaced by a fixed
    /// placeholder instead of being logged unredacted.
    ///
    /// This is a best-effort filter over log text, not a security boundary: it only
    /// sees what goes through this logger, and it can only mask what your code
    /// recognizes. Prefer not logging secrets at all.
    ///
    /// ```
    /// let plugin = zeep_logger::Builder::development()
    ///     .redactor(|entry| entry.message = entry.message.replace("hunter2", "[REDACTED]"))
    ///     .build::<tauri::Wry>();
    /// # let _ = plugin;
    /// ```
    pub fn redactor<F>(mut self, redact: F) -> Self
    where
        F: Fn(&mut LogEntry) + Send + Sync + 'static,
    {
        self.redactor = Some(Arc::new(redact));
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        let ring = Arc::new(RwLock::new(VecDeque::new()));
        let ring_cmd = ring.clone();
        let level_atomic = Arc::new(AtomicU8::new(level_to_code(self.level)));
        let level_cmd = level_atomic.clone();
        let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<LogEntry>();

        let has_webview = self.targets.iter().any(|t| matches!(t, LogTarget::Webview));
        let max_file_size = self.max_file_size.min(u64::MAX as u128) as u64;
        let rotation_strategy = self.rotation_strategy.clone();
        let level_filter = self.level;
        let targets = self.targets;
        let redactor = self.redactor;
        let mut rx = Some(rx);

        PluginBuilder::<R>::new("zeep-logger")
            .setup(move |app, _api| {
                app.manage(RingState(ring_cmd));
                app.manage(LevelState(level_cmd.clone()));

                let ring_format = ring.clone();
                let tx_format = tx.clone();
                let redactor_format = redactor.clone();

                let mut dispatch = fern::Dispatch::new()
                    .level(level_filter)
                    .format(move |out, message, record| {
                        // Redact first: the same entry feeds the ring buffer, the
                        // webview channel and the line written to stdout/files.
                        let entry = apply_redactor(
                            redactor_format.as_ref(),
                            build_json_entry(record.level(), record.target(), message),
                        );

                        if let Ok(mut r) = ring_format.write() {
                            if r.len() >= RING_CAPACITY {
                                r.pop_front();
                            }
                            r.push_back(entry.clone());
                        }
                        let _ = tx_format.send(entry.clone());

                        let line = serde_json::to_string(&entry)
                            .unwrap_or_else(|_| entry.message.clone());
                        out.finish(format_args!("{line}"));
                    });

                let app_name = app.package_info().name.clone();

                for target in &targets {
                    use fern::Output;
                    let output: Output = match target {
                        LogTarget::Stdout => Output::stdout("\n"),
                        LogTarget::Stderr => Output::stderr("\n"),
                        LogTarget::LogDir(file_name) => {
                            let dir = app.path().app_log_dir()?;
                            let name = file_name.clone().unwrap_or_else(|| app_name.clone());
                            let rotator = RotatingFile::new(
                                dir,
                                name,
                                max_file_size,
                                rotation_strategy.clone(),
                            )?;
                            Output::writer(Box::new(rotator), "\n")
                        }
                        LogTarget::Folder(path, file_name) => {
                            let name = file_name.clone().unwrap_or_else(|| app_name.clone());
                            let rotator = RotatingFile::new(
                                path.clone(),
                                name,
                                max_file_size,
                                rotation_strategy.clone(),
                            )?;
                            Output::writer(Box::new(rotator), "\n")
                        }
                        LogTarget::Webview => continue,
                    };

                    dispatch = dispatch.chain(output);
                }

                if has_webview {
                    if let Some(mut rx) = rx.take() {
                        let app_handle = app.app_handle().clone();
                        // Tauri runs plugin `setup` outside any Tokio runtime, so
                        // `tokio::spawn` panics here. Use Tauri's own runtime.
                        tauri::async_runtime::spawn(async move {
                            while let Some(entry) = rx.recv().await {
                                let _ = app_handle.emit("log://log", &entry);
                            }
                        });
                    }
                }

                let (_, logger) = dispatch.into_log();
                log::set_boxed_logger(logger)?;
                log::set_max_level(
                    code_to_level(level_cmd.load(Ordering::Relaxed)).unwrap_or(level_filter),
                );

                Ok(())
            })
            .invoke_handler(tauri::generate_handler![
                logger_set_level,
                logger_get_entries,
            ])
            .build()
    }
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
fn logger_set_level(
    level_state: tauri::State<'_, LevelState>,
    level: u8,
) -> Result<(), String> {
    // 0 (Off) is internal only; the public range is 1..=5.
    let new_level = code_to_level(level)
        .filter(|l| *l != log::LevelFilter::Off)
        .ok_or_else(|| format!("invalid log level: {level}"))?;

    level_state.0.store(level_to_code(new_level), Ordering::Relaxed);
    log::set_max_level(new_level);

    log::info!(target: "zeep-logger", "log level changed to {new_level}");

    Ok(())
}

#[tauri::command]
fn logger_get_entries(ring: tauri::State<'_, RingState>) -> Vec<LogEntry> {
    ring.0
        .read()
        .map(|r| r.iter().cloned().collect())
        .unwrap_or_default()
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

    fn entry(message: &str) -> LogEntry {
        LogEntry {
            timestamp: "t".into(),
            level: "INFO".into(),
            target: "app".into(),
            message: message.into(),
        }
    }

    #[test]
    fn no_redactor_leaves_the_entry_untouched() {
        let out = apply_redactor(None, entry("token=abc"));
        assert_eq!(out.message, "token=abc");
    }

    #[test]
    fn redactor_can_rewrite_the_message() {
        let r: Redactor = Arc::new(|e: &mut LogEntry| e.message = e.message.replace("abc", "***"));
        let out = apply_redactor(Some(&r), entry("token=abc"));
        assert_eq!(out.message, "token=***");
        assert_eq!(out.level, "INFO");
    }

    #[test]
    fn panicking_redactor_withholds_the_message() {
        // Fail closed: if the redactor panics we must not fall back to the
        // unredacted text.
        let r: Redactor = Arc::new(|_: &mut LogEntry| panic!("boom"));
        let out = apply_redactor(Some(&r), entry("token=abc"));
        assert_eq!(out.message, REDACTOR_PANIC_MESSAGE);
        assert!(!out.message.contains("abc"));
    }

    #[test]
    fn level_codes_match_the_frontend_contract() {
        // Must stay in sync with LOG_LEVEL_VALUES in @zeeptech/logger.
        assert_eq!(level_to_code(log::LevelFilter::Trace), 1);
        assert_eq!(level_to_code(log::LevelFilter::Debug), 2);
        assert_eq!(level_to_code(log::LevelFilter::Info), 3);
        assert_eq!(level_to_code(log::LevelFilter::Warn), 4);
        assert_eq!(level_to_code(log::LevelFilter::Error), 5);
    }

    #[test]
    fn level_codes_round_trip_for_every_level() {
        for level in [
            log::LevelFilter::Off,
            log::LevelFilter::Error,
            log::LevelFilter::Warn,
            log::LevelFilter::Info,
            log::LevelFilter::Debug,
            log::LevelFilter::Trace,
        ] {
            assert_eq!(code_to_level(level_to_code(level)), Some(level));
        }
        assert_eq!(code_to_level(6), None);
    }

    #[test]
    fn development_preset_builds_a_plugin() {
        let plugin = Builder::development().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "zeep-logger");
    }

    #[test]
    fn production_preset_builds_a_plugin() {
        let plugin = Builder::production().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "zeep-logger");
    }

    #[test]
    fn json_entry_produces_expected_fields() {
        let message = format_args!("hello world");
        let entry = build_json_entry(log::Level::Info, "zeep_logger::tests", &message);

        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.target, "zeep_logger::tests");
        assert_eq!(entry.message, "hello world");
        assert!(entry.timestamp.len() > 10);
    }

    #[test]
    fn json_entry_serializes_to_valid_json() {
        let message = format_args!("test");
        let entry = build_json_entry(log::Level::Warn, "test", &message);
        let json = serde_json::to_string(&entry).expect("serialize");
        assert!(json.contains("\"level\":\"WARN\""));
        assert!(json.contains("\"message\":\"test\""));
    }

    #[test]
    fn ring_buffer_capacity_is_respected() {
        let ring = Arc::new(RwLock::new(VecDeque::new()));
        let msg = format_args!("x");
        for i in 0..RING_CAPACITY + 50 {
            let entry = build_json_entry(log::Level::Debug, &format!("tgt_{i}"), &msg);
            let mut r = ring.write().unwrap();
            if r.len() >= RING_CAPACITY {
                r.pop_front();
            }
            r.push_back(entry);
        }
        let r = ring.read().unwrap();
        assert_eq!(r.len(), RING_CAPACITY);
    }

    #[test]
    fn cleanup_removes_files_older_than_cutoff_and_keeps_newer_ones() {
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
