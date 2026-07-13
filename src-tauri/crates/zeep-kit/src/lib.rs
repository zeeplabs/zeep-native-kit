pub use zeep_core;

pub struct Builder {
    namespace: Option<String>,
}

impl Builder {
    pub fn new() -> Self {
        Self { namespace: None }
    }

    pub fn namespace(mut self, ns: impl Into<String>) -> Self {
        self.namespace = Some(ns.into());
        self
    }
}

impl Default for Builder {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_keychain_service(namespace: &str) -> String {
    format!("dev.zeep.{namespace}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_service_from_namespace() {
        assert_eq!(resolve_keychain_service("zeep-demo"), "dev.zeep.zeep-demo");
    }

    #[test]
    fn derives_service_from_custom_namespace() {
        assert_eq!(resolve_keychain_service("acme-app"), "dev.zeep.acme-app");
    }
}
