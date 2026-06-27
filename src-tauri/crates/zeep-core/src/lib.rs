pub mod error;

#[cfg(feature = "prefs")]
pub mod prefs;

#[cfg(feature = "keychain")]
pub mod keychain;

#[cfg(feature = "shell")]
pub mod shell;

pub use error::Error;
pub type Result<T> = std::result::Result<T, Error>;
