//! Exact managed sidecar names; never accept a path or arbitrary filename.
use std::{io, path::{Path, PathBuf}};

pub const MAX_MANAGED_NAME_BYTES: usize = 230;

fn digest(value: &str, lowercase_only: bool) -> bool {
    value.len() == 64 && value.bytes().all(|c|
        c.is_ascii_digit() || (b'a'..=b'f').contains(&c)
            || (!lowercase_only && (b'A'..=b'F').contains(&c)))
}

pub fn valid_managed_name(name: &str) -> bool {
    if name.len() > MAX_MANAGED_NAME_BYTES { return false; }
    if matches!(name, "library.json" | "preferences.json" | "practice-error-log.json" | "viewer-derived-cache-v1.json") {
        return true;
    }
    if let Some(hash) = name.strip_prefix("package-").and_then(|s|s.strip_suffix(".isoscore")) {
        return digest(hash, false);
    }
    if let Some(hash) = name.strip_prefix("state-version-").and_then(|s|s.strip_suffix(".json")) {
        return digest(hash, true);
    }
    for kind in ["state-", "practice-", "performance-"] {
        let Some(rest) = name.strip_prefix(kind).and_then(|s|s.strip_suffix(".json")) else { continue; };
        // Retain the legacy ASCII-hexdigit contract, including uppercase.
        if digest(rest, false) { return true; }
        for layout in ["conventional-piano", "janko-four-row"] {
            let marker = format!("-{layout}-");
            let Some((source, hashes)) = rest.split_once(&marker) else { continue; };
            let Some((profile, hands)) = hashes.split_once('-') else { continue; };
            if digest(source, true) && digest(profile, true) && digest(hands, true) { return true; }
        }
    }
    false
}

/// Called only after creating the app's data directory. Rust's Windows
/// canonicalize returns an absolute verbatim path, so the existing MoveFileExW
/// replacement can handle a 230-byte sidecar without MAX_PATH truncation.
pub fn managed_directory(dir: &Path) -> io::Result<PathBuf> {
    #[cfg(windows)] { std::fs::canonicalize(dir) }
    #[cfg(not(windows))] { Ok(dir.to_path_buf()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn v2(kind: &str, layout: &str) -> String {
        format!("{kind}-{}-{layout}-{}-{}.json", "a".repeat(64), "b".repeat(64), "c".repeat(64))
    }

    #[test]
    fn fixed_files_are_exact_and_other_json_is_not_managed() {
        for name in ["library.json", "preferences.json", "practice-error-log.json", "viewer-derived-cache-v1.json"] {
            assert!(valid_managed_name(name));
        }
        for name in ["library.pending", "Library.json", "notes.json", "library.json.backup", "viewer-derived-cache.json", "viewer-derived-cache-v2.json", "Viewer-derived-cache-v1.json", "viewer-derived-cache-v1.json.backup", "../viewer-derived-cache-v1.json"] {
            assert!(!valid_managed_name(name));
        }
    }
    #[test]
    fn legacy_package_and_sidecars_keep_the_existing_hex_contract() {
        for hash in ["a".repeat(64), "ABCDEF01".repeat(8)] {
            assert!(valid_managed_name(&format!("package-{hash}.isoscore")));
            for kind in ["state", "practice", "performance"] {
                assert!(valid_managed_name(&format!("{kind}-{hash}.json")));
            }
        }
    }
    #[test]
    fn every_supported_partition_matches_the_frontend_storage_contract() {
        for kind in ["state", "practice", "performance"] {
            for layout in ["conventional-piano", "janko-four-row"] {
                assert!(valid_managed_name(&v2(kind, layout)));
            }
        }
        assert_eq!(v2("performance", "conventional-piano").len(), MAX_MANAGED_NAME_BYTES);
    }
    #[test]
    fn atomic_install_versions_have_one_lowercase_digest() {
        assert!(valid_managed_name(&format!("state-version-{}.json", "d".repeat(64))));
        assert!(!valid_managed_name(&format!("state-version-{}.json", "D".repeat(64))));
        assert!(!valid_managed_name(&format!("practice-version-{}.json", "d".repeat(64))));
    }
    #[test]
    fn partitions_reject_unknown_layouts_wrong_hashes_and_extra_components() {
        let valid = v2("state", "conventional-piano");
        for wrong in [v2("state", "piano"), v2("state", "janko-six-row"),
            valid.replace(&"a".repeat(64), &"a".repeat(63)),
            valid.replace(&"b".repeat(64), &"b".repeat(65)),
            valid.replace(&"c".repeat(64), &"g".repeat(64)),
            valid.replace(&"b".repeat(64), &"B".repeat(64)),
            valid.replace(".json", "-extra.json"), valid.replace(".json", ".pending")]
        { assert!(!valid_managed_name(&wrong), "accepted {wrong}"); }
    }
    #[test]
    fn paths_control_characters_unicode_and_reserved_names_are_rejected() {
        for wrong in ["../library.json", "..\\library.json", "/library.json", "C:\\library.json",
            "library.json\0", "library.json\n", "CON", "NUL.json", "préférences.json"]
        { assert!(!valid_managed_name(wrong)); }
        let valid=v2("performance", "conventional-piano");
        assert!(!valid_managed_name(&format!("x{valid}")));
        assert!(!valid_managed_name(&valid.replace(&"a".repeat(64), &"a".repeat(65))));
    }
    #[cfg(windows)]
    #[test]
    fn windows_directory_is_verbatim_for_long_sidecars() {
        let dir=std::env::temp_dir().join(format!("iso-managed-path-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let resolved=managed_directory(&dir).unwrap();
        assert!(resolved.to_string_lossy().starts_with("\\\\?\\"));
        let path=resolved.join(v2("performance", "conventional-piano"));
        assert!(path.as_os_str().len()>260);
        std::fs::write(&path,b"isolated test").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(),b"isolated test");
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
