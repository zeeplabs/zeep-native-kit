use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

pub struct Builder {
    inner: tauri_plugin_log::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_log::Builder::new(),
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
}
