use std::collections::HashMap;
use std::os::unix::process::CommandExt;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;
use serde::Serialize;
use tauri::{Emitter, Runtime};

pub type RunId = u64;

#[derive(Debug, Clone, Serialize)]
pub struct AiChunk {
    pub run_id: RunId,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiDone {
    pub run_id: RunId,
}

struct RunState {
    // Held to keep the child process alive for the run's duration; killed via
    // `pgid` (D15: libc::killpg for process-group cancellation), not `Child::kill()`.
    #[allow(dead_code)]
    child: tokio::process::Child,
    pgid: i32,
}

pub struct AIRunner {
    next_id: AtomicU64,
    runs: Arc<Mutex<HashMap<RunId, RunState>>>,
}

impl AIRunner {
    pub fn new() -> Self {
        Self { next_id: AtomicU64::new(1), runs: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub async fn run_stream<R: Runtime>(
        &self,
        binary: &str,
        args: &[String],
        prompt: &str,
        app_handle: tauri::AppHandle<R>,
    ) -> Result<RunId, String> {
        use tokio::io::AsyncWriteExt;

        let mut cmd = Command::new(binary);
        cmd.args(args);
        cmd.stdin(std::process::Stdio::piped());
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        unsafe {
            cmd.as_std_mut().pre_exec(|| {
                libc::setsid();
                Ok(())
            });
        }

        let mut child = cmd.spawn().map_err(|e| e.to_string())?;
        let pid = child.id().ok_or("no child pid")?;
        let pgid = pid as i32;

        let run_id = self.next_id.fetch_add(1, Ordering::Relaxed);

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(prompt.as_bytes()).await.map_err(|e| e.to_string())?;
            stdin.flush().await.map_err(|e| e.to_string())?;
        }

        let run_id_clone = run_id;
        let app_handle_clone = app_handle.clone();
        let stdout = child.stdout.take().ok_or("no stdout")?;

        self.runs.lock().unwrap().insert(run_id, RunState { child, pgid });

        tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_handle_clone.emit("ai:chunk", AiChunk {
                    run_id: run_id_clone,
                    text: line,
                });
            }
            let _ = app_handle_clone.emit("ai:done", AiDone { run_id: run_id_clone });
        });

        Ok(run_id)
    }

    pub async fn run_blocking(
        &self,
        binary: &str,
        args: &[String],
        prompt: &str,
    ) -> Result<String, String> {
        use tokio::io::AsyncWriteExt;

        let mut cmd = Command::new(binary);
        cmd.args(args);
        cmd.stdin(std::process::Stdio::piped());
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| e.to_string())?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(prompt.as_bytes()).await.map_err(|e| e.to_string())?;
            stdin.flush().await.map_err(|e| e.to_string())?;
        }

        let output = child.wait_with_output().await.map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    pub fn cancel(&self, run_id: RunId) -> Result<(), String> {
        let state = self.runs.lock().unwrap().remove(&run_id).ok_or("run not found")?;
        let result = unsafe { libc::killpg(state.pgid, libc::SIGTERM) };
        if result != 0 {
            return Err("failed to kill process group".into());
        }
        let pgid = state.pgid;
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            unsafe { libc::killpg(pgid, libc::SIGKILL); }
        });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn run_blocking_echoes_prompt_via_stdin() {
        let runner = AIRunner::new();
        let output = runner
            .run_blocking("cat", &[], "hello from prompt")
            .await
            .unwrap();
        assert_eq!(output, "hello from prompt");
    }

    #[tokio::test]
    async fn run_blocking_unknown_binary_errors() {
        let runner = AIRunner::new();
        let result = runner
            .run_blocking("definitely-not-a-real-binary-zt8", &[], "x")
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn run_stream_emits_run_id_and_tracks_state() {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        let runner = AIRunner::new();

        let run_id = runner
            .run_stream("cat", &[], "streamed line", handle)
            .await
            .unwrap();

        assert_eq!(run_id, 1);
        // second run increments the id
        let app2 = tauri::test::mock_app();
        let run_id2 = runner
            .run_stream("cat", &[], "another", app2.handle().clone())
            .await
            .unwrap();
        assert_eq!(run_id2, 2);
    }

    #[tokio::test]
    async fn cancel_kills_tracked_process_group() {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        let runner = AIRunner::new();

        let run_id = runner
            .run_stream("sleep", &["5".to_string()], "", handle)
            .await
            .unwrap();

        assert!(runner.cancel(run_id).is_ok());
    }

    #[test]
    fn cancel_unknown_run_id_errors() {
        let runner = AIRunner::new();
        assert!(runner.cancel(999).is_err());
    }
}
