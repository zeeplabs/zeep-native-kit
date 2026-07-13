use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::Duration;

use serde::Serialize;
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;

use crate::{Error, Result};

const DEFAULT_TIMEOUT_SECS: u64 = 30;

#[cfg(unix)]
const PATH_FALLBACKS: &[&str] = &["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin"];
#[cfg(not(unix))]
const PATH_FALLBACKS: &[&str] = &[];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

pub struct ShellRunner {
    pub default_cwd: PathBuf,
    pub timeout_secs: u64,
}

/// Tauri AppState type for ShellRunner.
pub type ShellState = Arc<RwLock<ShellRunner>>;

impl ShellRunner {
    pub fn new(default_cwd: PathBuf) -> Self {
        Self {
            default_cwd,
            timeout_secs: DEFAULT_TIMEOUT_SECS,
        }
    }

    /// Resolves binary from PATH env + hardcoded fallbacks (SHL-01, SHL-02).
    pub fn which(program: &str) -> Option<PathBuf> {
        let path_var = std::env::var("PATH").unwrap_or_default();
        let mut dirs: Vec<&str> = path_var.split(':').collect();
        dirs.extend_from_slice(PATH_FALLBACKS);

        for dir in dirs {
            if dir.is_empty() {
                continue;
            }
            let candidate = Path::new(dir).join(program);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
        None
    }

    /// Runs program and collects stdout/stderr (SHL-03, SHL-04).
    /// Respects timeout (SHL-06). cwd defaults to default_cwd (SHL-07).
    /// Args are passed as array — no shell expansion (SHL-11).
    pub async fn run(
        default_cwd: &Path,
        timeout_secs: u64,
        program: &str,
        args: &[String],
        cwd: Option<&Path>,
        env: Option<&HashMap<String, String>>,
    ) -> Result<ShellOutput> {
        let binary = Self::which(program)
            .ok_or_else(|| Error::Shell(format!("program not found: {program}")))?;

        let work_dir = cwd.unwrap_or(default_cwd);

        let mut cmd = Command::new(&binary);
        cmd.args(args);
        cmd.current_dir(work_dir);

        if let Some(env_map) = env {
            for (k, v) in env_map {
                cmd.env(k, v);
            }
        }

        let output = tokio::time::timeout(Duration::from_secs(timeout_secs), cmd.output())
            .await
            .map_err(|_| Error::Shell(format!("timeout after {timeout_secs}s")))?
            .map_err(|e| Error::Shell(e.to_string()))?;

        Ok(ShellOutput {
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
            exit_code: output.status.code().unwrap_or(-1),
        })
    }
}

// ── Tauri commands (SHL-08) ──────────────────────────────────────────────────

/// Returns the resolved binary path or null (SHL-09).
#[tauri::command]
pub fn shell_which(program: String) -> Option<String> {
    ShellRunner::which(&program).map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn shell_run(
    state: tauri::State<'_, ShellState>,
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
) -> std::result::Result<ShellOutput, String> {
    let (default_cwd, timeout_secs) = {
        let runner = state.read().map_err(|e| e.to_string())?;
        (runner.default_cwd.clone(), runner.timeout_secs)
    };

    let cwd_path = cwd.as_deref().map(PathBuf::from);

    ShellRunner::run(
        &default_cwd,
        timeout_secs,
        &program,
        &args,
        cwd_path.as_deref(),
        env.as_ref(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// Streams stdout/stderr as Tauri events `shell:stdout` / `shell:stderr` (SHL-05).
/// No timeout — fires until process exits (SHL-06).
#[tauri::command]
pub async fn shell_run_stream<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, ShellState>,
    program: String,
    args: Vec<String>,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
) -> std::result::Result<(), String> {
    use tauri::Emitter;

    let default_cwd = {
        let runner = state.read().map_err(|e| e.to_string())?;
        runner.default_cwd.clone()
    };

    let binary = ShellRunner::which(&program)
        .ok_or_else(|| format!("program not found: {program}"))?;

    let work_dir = cwd.as_deref().map(PathBuf::from).unwrap_or(default_cwd);

    let mut cmd = Command::new(&binary);
    cmd.args(&args);
    cmd.current_dir(&work_dir);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    if let Some(env_map) = &env {
        for (k, v) in env_map {
            cmd.env(k, v);
        }
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    let stdout_pipe = child.stdout.take().ok_or("failed to capture stdout")?;
    let stderr_pipe = child.stderr.take().ok_or("failed to capture stderr")?;

    let app_out = app.clone();
    let stdout_task = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stdout_pipe).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit("shell:stdout", line);
        }
    });

    let stderr_task = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stderr_pipe).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app.emit("shell:stderr", line);
        }
    });

    child.wait().await.map_err(|e| e.to_string())?;
    let _ = tokio::join!(stdout_task, stderr_task);

    Ok(())
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn which_finds_echo() {
        let path = ShellRunner::which("echo");
        assert!(path.is_some(), "echo must be resolvable");
        assert!(path.unwrap().is_file());
    }

    #[test]
    fn which_returns_none_for_missing() {
        assert!(ShellRunner::which("definitely-not-a-real-binary-xyz-zt8").is_none());
    }

    #[tokio::test]
    async fn run_echo() {
        let tmp = std::env::temp_dir();
        let out = ShellRunner::run(
            &tmp,
            DEFAULT_TIMEOUT_SECS,
            "echo",
            &["hello zt8".to_string()],
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(out.stdout.trim(), "hello zt8");
        assert_eq!(out.exit_code, 0);
    }

    #[tokio::test]
    async fn args_are_not_shell_expanded() {
        let tmp = std::env::temp_dir();
        let out = ShellRunner::run(
            &tmp,
            DEFAULT_TIMEOUT_SECS,
            "echo",
            &["hello; echo injected".to_string()],
            None,
            None,
        )
        .await
        .unwrap();

        // SHL-11: shell operators in args treated as literals
        assert_eq!(out.stdout.trim(), "hello; echo injected");
    }

    #[tokio::test]
    async fn env_override_applied() {
        let tmp = std::env::temp_dir();
        let mut env = HashMap::new();
        env.insert("ZT8_TEST_VAR".to_string(), "zeep_value".to_string());

        let out = ShellRunner::run(
            &tmp,
            DEFAULT_TIMEOUT_SECS,
            "sh",
            &["-c".to_string(), "echo $ZT8_TEST_VAR".to_string()],
            None,
            Some(&env),
        )
        .await
        .unwrap();

        assert_eq!(out.stdout.trim(), "zeep_value");
    }

    #[tokio::test]
    async fn nonzero_exit_code_captured() {
        let tmp = std::env::temp_dir();
        let out = ShellRunner::run(
            &tmp,
            DEFAULT_TIMEOUT_SECS,
            "sh",
            &["-c".to_string(), "exit 42".to_string()],
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(out.exit_code, 42);
    }
}
