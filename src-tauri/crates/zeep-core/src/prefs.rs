use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::{Error, Result};

pub struct PrefsStore {
    namespace: String,
    path: PathBuf,
}

/// Tauri AppState type for PrefsStore (PRF-10).
pub type PrefsState = Arc<RwLock<PrefsStore>>;

impl PrefsStore {
    /// Creates a new store.
    /// File lives at `{app_data_dir}/{namespace}/prefs.json` (PRF-09).
    pub fn new(namespace: impl Into<String>, app_data_dir: PathBuf) -> Self {
        let namespace = namespace.into();
        let path = app_data_dir.join(&namespace).join("prefs.json");
        Self { namespace, path }
    }

    fn namespaced(&self, key: &str) -> String {
        format!("{}.{}", self.namespace, key)
    }

    fn load(&self) -> Result<HashMap<String, Value>> {
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        let contents = std::fs::read_to_string(&self.path)?;
        serde_json::from_str(&contents).map_err(|e| Error::Prefs(e.to_string()))
    }

    fn persist(&self, data: &HashMap<String, Value>) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(data)
            .map_err(|e| Error::Prefs(e.to_string()))?;
        std::fs::write(&self.path, json)?;
        Ok(())
    }

    /// Returns `None` on missing key — never panics (PRF-04).
    pub fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let data = self.load()?;
        Ok(data
            .get(&self.namespaced(key))
            .and_then(|v| serde_json::from_value(v.clone()).ok()))
    }

    /// Writes immediately — no deferred flush (PRF-05).
    pub fn set(&self, key: &str, value: Value) -> Result<()> {
        let mut data = self.load()?;
        data.insert(self.namespaced(key), value);
        self.persist(&data)
    }

    /// Removes a single key (PRF-06).
    pub fn delete(&self, key: &str) -> Result<()> {
        let mut data = self.load()?;
        data.remove(&self.namespaced(key));
        self.persist(&data)
    }

    /// Wipes the entire namespace (PRF-06).
    pub fn clear(&self) -> Result<()> {
        self.persist(&HashMap::new())
    }

    /// Returns all keys in this namespace, without the namespace prefix (PRF-07).
    pub fn get_all(&self) -> Result<HashMap<String, Value>> {
        let prefix = format!("{}.", self.namespace);
        let data = self.load()?;
        Ok(data
            .into_iter()
            .filter_map(|(k, v)| {
                k.strip_prefix(&prefix).map(|short| (short.to_string(), v))
            })
            .collect())
    }
}

// ── Tauri commands (PRF-08) ──────────────────────────────────────────────────

#[tauri::command]
pub fn prefs_get(
    state: tauri::State<'_, PrefsState>,
    key: String,
) -> std::result::Result<Option<Value>, String> {
    state
        .read()
        .map_err(|e| e.to_string())?
        .get::<Value>(&key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn prefs_set(
    state: tauri::State<'_, PrefsState>,
    key: String,
    value: Value,
) -> std::result::Result<(), String> {
    state
        .write()
        .map_err(|e| e.to_string())?
        .set(&key, value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn prefs_delete(
    state: tauri::State<'_, PrefsState>,
    key: String,
) -> std::result::Result<(), String> {
    state
        .write()
        .map_err(|e| e.to_string())?
        .delete(&key)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn prefs_get_all(
    state: tauri::State<'_, PrefsState>,
) -> std::result::Result<HashMap<String, Value>, String> {
    state
        .read()
        .map_err(|e| e.to_string())?
        .get_all()
        .map_err(|e| e.to_string())
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

    fn make_store(ns: &str) -> (PrefsStore, PathBuf) {
        let base = std::env::temp_dir().join("zeep_prefs_tests");
        let store_dir = base.join(ns);
        let _ = fs::remove_dir_all(&store_dir);
        let store = PrefsStore::new(ns, base);
        (store, store_dir)
    }

    #[test]
    fn roundtrip_string() {
        let (store, dir) = make_store("t_roundtrip");
        store.set("theme", json!("dark")).unwrap();
        let v: Option<String> = store.get("theme").unwrap();
        assert_eq!(v.as_deref(), Some("dark"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn roundtrip_bool() {
        let (store, dir) = make_store("t_bool");
        store.set("enabled", json!(true)).unwrap();
        let v: Option<bool> = store.get("enabled").unwrap();
        assert_eq!(v, Some(true));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn roundtrip_i64() {
        let (store, dir) = make_store("t_i64");
        store.set("count", json!(42i64)).unwrap();
        let v: Option<i64> = store.get("count").unwrap();
        assert_eq!(v, Some(42));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn missing_key_returns_none() {
        let (store, dir) = make_store("t_missing");
        let v: Option<String> = store.get("nope").unwrap();
        assert!(v.is_none());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn namespace_isolation() {
        let base = std::env::temp_dir().join("zeep_prefs_tests");
        let _ = fs::remove_dir_all(base.join("ns_a"));
        let _ = fs::remove_dir_all(base.join("ns_b"));
        let store_a = PrefsStore::new("ns_a", base.clone());
        let store_b = PrefsStore::new("ns_b", base.clone());
        store_a.set("key", json!(1)).unwrap();
        let from_b: Option<i64> = store_b.get("key").unwrap();
        assert!(from_b.is_none(), "ns_b must not see ns_a keys");
        let _ = fs::remove_dir_all(base.join("ns_a"));
        let _ = fs::remove_dir_all(base.join("ns_b"));
    }

    #[test]
    fn delete_removes_key() {
        let (store, dir) = make_store("t_delete");
        store.set("x", json!(99)).unwrap();
        store.delete("x").unwrap();
        let v: Option<i64> = store.get("x").unwrap();
        assert!(v.is_none());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn clear_wipes_namespace() {
        let (store, dir) = make_store("t_clear");
        store.set("a", json!(1)).unwrap();
        store.set("b", json!(2)).unwrap();
        store.clear().unwrap();
        let all = store.get_all().unwrap();
        assert!(all.is_empty());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn get_all_returns_short_keys() {
        let (store, dir) = make_store("t_getall");
        store.set("x", json!(1)).unwrap();
        store.set("y", json!(2)).unwrap();
        let all = store.get_all().unwrap();
        assert_eq!(all.len(), 2);
        assert!(all.contains_key("x"));
        assert!(all.contains_key("y"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn set_overwrites_existing_key() {
        let (store, dir) = make_store("t_overwrite");
        store.set("v", json!("first")).unwrap();
        store.set("v", json!("second")).unwrap();
        let v: Option<String> = store.get("v").unwrap();
        assert_eq!(v.as_deref(), Some("second"));
        let _ = fs::remove_dir_all(dir);
    }
}
