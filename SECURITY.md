# Security Policy

## Supported Versions

zeep-native-kit is pre-1.0 in terms of publication status (packages are versioned
`1.0.0` internally but not yet published to npm/crates.io — see the README).
Security fixes target the latest commit on `main`.

| Version | Supported |
|---------|-----------|
| `main`  | ✅ |
| Tagged releases (once published) | ✅ latest minor only |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, use [GitHub Security Advisories](https://github.com/zeeplabs/zeep-native-kit/security/advisories/new)
to report privately. Include:

- A description of the vulnerability and its impact
- Steps to reproduce (PoC if possible)
- Affected package(s)/crate(s) and version(s)

You should expect an initial response within 5 business days. Once a fix is
confirmed, we will coordinate a disclosure timeline with you before publishing
a patched release and advisory.

## Scope

This policy covers the Rust crates in `src-tauri/crates/` and the npm packages
in `packages/@zeeptech/*`. Vulnerabilities in upstream dependencies (Tauri, keyring,
tauri-plugin-updater, etc.) should be reported to their respective maintainers,
but feel free to flag them here too if they affect zeep-native-kit's usage.
