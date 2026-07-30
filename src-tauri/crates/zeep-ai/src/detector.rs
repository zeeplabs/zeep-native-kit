use serde::{Deserialize, Serialize};

const CANDIDATES: &[&str] = &["claude", "codex", "ollama", "llm", "opencode"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedProvider {
    pub name: String,
    pub binary: String,
    pub version: Option<String>,
}

pub fn detect() -> Vec<DetectedProvider> {
    CANDIDATES.iter().filter_map(|name| {
        let binary = which(name)?;
        let version = get_version(&binary);
        Some(DetectedProvider { name: name.to_string(), binary, version })
    }).collect()
}

fn which(name: &str) -> Option<String> {
    let output = std::process::Command::new("which").arg(name).output().ok()?;
    if !output.status.success() { return None; }
    Some(String::from_utf8(output.stdout).ok()?.trim().to_string())
}

fn get_version(binary: &str) -> Option<String> {
    let output = std::process::Command::new(binary).arg("--version").output().ok()?;
    let out = String::from_utf8(output.stdout).ok()?;
    out.lines().next().map(|s| s.to_string()).filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn which_returns_none_for_nonexistent() {
        assert!(which("nonexistent-cli-xyz").is_none());
    }

    #[test]
    fn which_returns_some_for_existing() {
        let result = which("sh");
        assert!(result.is_some());
    }

    #[test]
    fn get_version_parses_first_line() {
        // `sh --version` prints a banner on the first line on every platform we support.
        let version = get_version("sh");
        assert!(version.is_some());
    }

    #[test]
    fn get_version_none_for_missing_binary() {
        assert!(get_version("definitely-not-a-real-binary-zt8").is_none());
    }

    #[test]
    fn detect_never_errors_and_only_returns_known_candidates() {
        // DET-03: never errors; unavailable = empty vec. Runs against whatever CLIs
        // happen to be installed on the machine/CI runner — no assumption either way.
        let providers = detect();
        for p in &providers {
            assert!(CANDIDATES.contains(&p.name.as_str()));
            assert!(!p.binary.is_empty());
        }
    }

    #[test]
    fn detect_includes_claude_if_present_in_path_skips_otherwise() {
        // Integration check from the zeep-ai spec: spawn the real `claude` CLI
        // if it's on PATH, skip the assertion entirely otherwise (CI runners
        // won't have it installed).
        if which("claude").is_none() {
            return;
        }
        let providers = detect();
        let claude = providers.iter().find(|p| p.name == "claude");
        assert!(claude.is_some(), "claude is on PATH but detect() missed it");
        assert!(claude.unwrap().version.is_some());
    }
}
