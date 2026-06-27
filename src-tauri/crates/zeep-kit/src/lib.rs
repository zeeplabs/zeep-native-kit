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
