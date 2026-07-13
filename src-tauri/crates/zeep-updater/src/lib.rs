use tauri::plugin::TauriPlugin;
use tauri::Runtime;
use tauri_plugin_updater::{Config, RemoteRelease};

fn is_stable_and_newer(current: semver::Version, remote: RemoteRelease) -> bool {
    is_stable_and_newer_version(&current, &remote.version)
}

fn is_stable_and_newer_version(current: &semver::Version, remote: &semver::Version) -> bool {
    remote.pre.is_empty() && remote > current
}

pub struct Builder {
    inner: tauri_plugin_updater::Builder,
}

impl Builder {
    pub fn new() -> Self {
        Self {
            inner: tauri_plugin_updater::Builder::new()
                .default_version_comparator(is_stable_and_newer),
        }
    }

    pub fn pubkey(mut self, pubkey: impl Into<String>) -> Self {
        self.inner = self.inner.pubkey(pubkey);
        self
    }

    pub fn target(mut self, target: impl Into<String>) -> Self {
        self.inner = self.inner.target(target);
        self
    }

    pub fn build<R: Runtime>(self) -> TauriPlugin<R, Config> {
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
    fn build_returns_a_plugin() {
        let plugin = Builder::new().build::<tauri::test::MockRuntime>();
        assert_eq!(plugin.name(), "updater");
    }

    #[test]
    fn rejects_stable_but_not_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer_version(
            &current,
            &semver::Version::parse("1.2.0").unwrap()
        ));
        assert!(!is_stable_and_newer_version(
            &current,
            &semver::Version::parse("1.1.0").unwrap()
        ));
    }

    #[test]
    fn accepts_stable_and_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(is_stable_and_newer_version(
            &current,
            &semver::Version::parse("1.3.0").unwrap()
        ));
    }

    #[test]
    fn rejects_prerelease_even_if_newer() {
        let current = semver::Version::parse("1.2.0").unwrap();
        assert!(!is_stable_and_newer_version(
            &current,
            &semver::Version::parse("1.3.0-beta.1").unwrap()
        ));
    }
}
