#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("prefs error: {0}")]
    Prefs(String),

    #[error("keychain error: {0}")]
    Keychain(String),

    #[error("shell error: {0}")]
    Shell(String),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
