use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunOpts {
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub system: Option<String>,
}

impl Default for RunOpts {
    fn default() -> Self {
        Self { model: None, max_tokens: None, system: None }
    }
}

pub trait ProviderAdapter: Send + Sync {
    fn name(&self) -> &'static str;
    fn build_args(&self, opts: &RunOpts) -> Vec<String>;
}

pub struct ClaudeAdapter;
impl ProviderAdapter for ClaudeAdapter {
    fn name(&self) -> &'static str { "claude" }
    fn build_args(&self, opts: &RunOpts) -> Vec<String> {
        let mut args = vec!["-p".into()];
        if let Some(system) = &opts.system {
            args.extend(["--system".into(), system.clone()]);
        }
        if let Some(max_tokens) = opts.max_tokens {
            args.extend(["--max-tokens".into(), max_tokens.to_string()]);
        }
        args
    }
}

pub struct CodexAdapter;
impl ProviderAdapter for CodexAdapter {
    fn name(&self) -> &'static str { "codex" }
    fn build_args(&self, _opts: &RunOpts) -> Vec<String> {
        vec!["-i".into()]
    }
}

pub struct OllamaAdapter;
impl ProviderAdapter for OllamaAdapter {
    fn name(&self) -> &'static str { "ollama" }
    fn build_args(&self, opts: &RunOpts) -> Vec<String> {
        vec!["run".into(), opts.model.as_deref().unwrap_or("llama3.2").into()]
    }
}

pub struct LlmAdapter;
impl ProviderAdapter for LlmAdapter {
    fn name(&self) -> &'static str { "llm" }
    fn build_args(&self, _opts: &RunOpts) -> Vec<String> {
        vec!["-t".into()]
    }
}

pub struct OpencodeAdapter;
impl ProviderAdapter for OpencodeAdapter {
    fn name(&self) -> &'static str { "opencode" }
    fn build_args(&self, _opts: &RunOpts) -> Vec<String> {
        vec!["-p".into()]
    }
}

pub fn get_adapter(name: &str) -> Option<Box<dyn ProviderAdapter>> {
    match name {
        "claude" => Some(Box::new(ClaudeAdapter)),
        "codex" => Some(Box::new(CodexAdapter)),
        "ollama" => Some(Box::new(OllamaAdapter)),
        "llm" => Some(Box::new(LlmAdapter)),
        "opencode" => Some(Box::new(OpencodeAdapter)),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_adapter_returns_none_for_unknown_provider() {
        assert!(get_adapter("unknown-cli").is_none());
    }

    #[test]
    fn get_adapter_resolves_all_known_providers() {
        for name in ["claude", "codex", "ollama", "llm", "opencode"] {
            let adapter = get_adapter(name).expect("adapter should resolve");
            assert_eq!(adapter.name(), name);
        }
    }

    #[test]
    fn claude_adapter_base_args() {
        let opts = RunOpts::default();
        assert_eq!(ClaudeAdapter.build_args(&opts), vec!["-p".to_string()]);
    }

    #[test]
    fn claude_adapter_appends_system() {
        let opts = RunOpts { system: Some("be terse".into()), ..RunOpts::default() };
        assert_eq!(
            ClaudeAdapter.build_args(&opts),
            vec!["-p", "--system", "be terse"]
        );
    }

    #[test]
    fn claude_adapter_appends_max_tokens() {
        let opts = RunOpts { max_tokens: Some(256), ..RunOpts::default() };
        assert_eq!(
            ClaudeAdapter.build_args(&opts),
            vec!["-p", "--max-tokens", "256"]
        );
    }

    #[test]
    fn claude_adapter_combines_system_and_max_tokens() {
        let opts = RunOpts { system: Some("sys".into()), max_tokens: Some(10), ..RunOpts::default() };
        assert_eq!(
            ClaudeAdapter.build_args(&opts),
            vec!["-p", "--system", "sys", "--max-tokens", "10"]
        );
    }

    #[test]
    fn codex_adapter_ignores_opts() {
        let opts = RunOpts { model: Some("gpt".into()), max_tokens: Some(99), system: Some("x".into()) };
        assert_eq!(CodexAdapter.build_args(&opts), vec!["-i".to_string()]);
    }

    #[test]
    fn ollama_adapter_defaults_model() {
        let opts = RunOpts::default();
        assert_eq!(
            OllamaAdapter.build_args(&opts),
            vec!["run".to_string(), "llama3.2".to_string()]
        );
    }

    #[test]
    fn ollama_adapter_uses_given_model() {
        let opts = RunOpts { model: Some("mistral".into()), ..RunOpts::default() };
        assert_eq!(
            OllamaAdapter.build_args(&opts),
            vec!["run".to_string(), "mistral".to_string()]
        );
    }

    #[test]
    fn llm_adapter_ignores_opts() {
        let opts = RunOpts { model: Some("m".into()), ..RunOpts::default() };
        assert_eq!(LlmAdapter.build_args(&opts), vec!["-t".to_string()]);
    }

    #[test]
    fn opencode_adapter_ignores_opts() {
        let opts = RunOpts::default();
        assert_eq!(OpencodeAdapter.build_args(&opts), vec!["-p".to_string()]);
    }
}
