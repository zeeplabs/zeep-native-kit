use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};

use keyring::{Entry, Error as KeyringError};

use crate::{Error, Result};

/// Keyring entry cache — entries are reused across calls so the underlying
/// credential object persists (required for the in-process mock in tests).
pub struct Keychain {
    service: String,
    entries: Mutex<HashMap<String, Entry>>,
}

/// Tauri AppState type for Keychain.
pub type KeychainState = Arc<RwLock<Keychain>>;

impl Keychain {
    /// Creates a new Keychain bound to `service` (KCH-03).
    pub fn new(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
            entries: Mutex::new(HashMap::new()),
        }
    }

    fn ensure_entry<'a>(
        service: &str,
        key: &str,
        map: &'a mut HashMap<String, Entry>,
    ) -> Result<&'a mut Entry> {
        if !map.contains_key(key) {
            let entry =
                Entry::new(service, key).map_err(|e| Error::Keychain(e.to_string()))?;
            map.insert(key.to_string(), entry);
        }
        Ok(map.get_mut(key).unwrap())
    }

    /// Stores a UTF-8 secret (KCH-04). Key name is safe to log; value is not (KCH-07).
    pub fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        let mut map = self.entries.lock().map_err(|e| Error::Keychain(e.to_string()))?;
        let entry = Self::ensure_entry(&self.service, key, &mut map)?;
        entry.set_password(value).map_err(|e| Error::Keychain(e.to_string()))
    }

    /// Returns `None` when key is absent — never errors on missing entry (KCH-05).
    pub fn get_secret(&self, key: &str) -> Result<Option<String>> {
        let mut map = self.entries.lock().map_err(|e| Error::Keychain(e.to_string()))?;
        let entry = Self::ensure_entry(&self.service, key, &mut map)?;
        match entry.get_password() {
            Ok(s) => Ok(Some(s)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(e) => Err(Error::Keychain(e.to_string())),
        }
    }

    /// Removes the entry. No-op if absent (KCH-06).
    pub fn delete_secret(&self, key: &str) -> Result<()> {
        let mut map = self.entries.lock().map_err(|e| Error::Keychain(e.to_string()))?;
        let entry = Self::ensure_entry(&self.service, key, &mut map)?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(KeyringError::NoEntry) => Ok(()),
            Err(e) => Err(Error::Keychain(e.to_string())),
        }
    }
}

// ── Tauri commands (KCH-08) ──────────────────────────────────────────────────

#[tauri::command]
pub fn keychain_set(
    state: tauri::State<'_, KeychainState>,
    key: String,
    value: String,
) -> std::result::Result<(), String> {
    state
        .read()
        .map_err(|e| e.to_string())?
        .set_secret(&key, &value)
        .map_err(|e| e.to_string())
}

/// Returns `null` (None) when absent — not an error (KCH-09).
#[tauri::command]
pub fn keychain_get(
    state: tauri::State<'_, KeychainState>,
    key: String,
) -> std::result::Result<Option<String>, String> {
    state
        .read()
        .map_err(|e| e.to_string())?
        .get_secret(&key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn keychain_delete(
    state: tauri::State<'_, KeychainState>,
    key: String,
) -> std::result::Result<(), String> {
    state
        .read()
        .map_err(|e| e.to_string())?
        .delete_secret(&key)
        .map_err(|e| e.to_string())
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn kc() -> Keychain {
        keyring::set_default_credential_builder(keyring::mock::default_credential_builder());
        Keychain::new("dev.zeep.test.keychain")
    }

    #[test]
    fn set_get_delete_cycle() {
        let kc = kc();
        let _ = kc.delete_secret("zt7-cycle");

        kc.set_secret("zt7-cycle", "s3cr3t").unwrap();
        let got = kc.get_secret("zt7-cycle").unwrap();
        assert_eq!(got.as_deref(), Some("s3cr3t"));

        kc.delete_secret("zt7-cycle").unwrap();
        let after = kc.get_secret("zt7-cycle").unwrap();
        assert!(after.is_none());
    }

    #[test]
    fn absent_key_returns_none() {
        let got = kc().get_secret("zt7-absent-xyz-999").unwrap();
        assert!(got.is_none());
    }

    #[test]
    fn delete_absent_is_noop() {
        kc().delete_secret("zt7-noop-xyz-999").unwrap();
    }

    #[test]
    fn overwrite_secret() {
        let kc = kc();
        let _ = kc.delete_secret("zt7-overwrite");

        kc.set_secret("zt7-overwrite", "v1").unwrap();
        kc.set_secret("zt7-overwrite", "v2").unwrap();
        let got = kc.get_secret("zt7-overwrite").unwrap();
        assert_eq!(got.as_deref(), Some("v2"));
    }
}
