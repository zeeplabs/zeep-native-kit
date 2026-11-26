//! Guards against the `keyring` crate silently falling back to its in-memory
//! mock store (issue #2). Lives in its own test binary so the unit tests'
//! `set_default_credential_builder(mock)` call cannot leak into it.
#![cfg(feature = "keychain")]

use zeep_core::keychain::Keychain;

/// Default credential store must be a native backend, never the mock.
/// Building an `Entry` does not touch the OS store, so this is safe in CI.
#[test]
#[cfg(any(target_os = "macos", target_os = "ios", target_os = "windows", target_os = "linux"))]
fn default_store_is_not_mock() {
    let entry = keyring::Entry::new("dev.zeep.test.native-probe", "probe")
        .expect("native keyring backend should build an entry");
    let is_mock = entry
        .get_credential()
        .downcast_ref::<keyring::mock::MockCredential>()
        .is_some();
    assert!(
        !is_mock,
        "keyring is using the in-memory mock store: secrets would not persist"
    );
}

/// Real round-trip against the OS store, through two independent `Keychain`
/// instances (fresh `Entry` objects). With the mock store the second instance
/// would read nothing. Ignored by default: it writes to the user's keychain and
/// on Linux needs a running Secret Service.
///
/// Run with: `cargo test -p zeep-core --test keychain_native -- --ignored`
#[test]
#[ignore = "touches the real OS credential store"]
fn persists_across_instances() {
    const SERVICE: &str = "dev.zeep.test.keychain-native";
    const KEY: &str = "zt-native-roundtrip";

    let writer = Keychain::new(SERVICE);
    writer.set_secret(KEY, "persisted-value").unwrap();
    drop(writer);

    let reader = Keychain::new(SERVICE);
    let got = reader.get_secret(KEY).unwrap();
    reader.delete_secret(KEY).unwrap();

    assert_eq!(got.as_deref(), Some("persisted-value"));
    assert!(reader.get_secret(KEY).unwrap().is_none());
}
