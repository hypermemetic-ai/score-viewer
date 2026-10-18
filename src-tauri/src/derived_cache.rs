//! The derived-file cache: engraving views, admission evidence and settled
//! engines this build already made, one file per entry, named by the digest of
//! its identity. Nothing here is user data. The cache grows to a total budget,
//! dropping its least recently used entries, and stops writing while free disk
//! space is under a floor. A refused or failed write, and a missing or damaged
//! entry, cost only time.
use std::{fs, io::{self, Read}, path::{Path, PathBuf}, time::SystemTime};

/// The cache's own directory, inside the managed data directory.
pub const DIRECTORY: &str = "viewer-derived-v2";
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    /// The total size the entries may reach before the oldest are dropped.
    pub budget_bytes: u64,
    /// Below this much free disk space, nothing new is written.
    pub free_space_floor_bytes: u64,
    /// One entry's ceiling, well above the largest real entry.
    pub entry_bytes: u64,
}
const MIB: u64 = 1024 * 1024;
pub const LIMITS: Limits = Limits { budget_bytes: 2048 * MIB, free_space_floor_bytes: 5120 * MIB, entry_bytes: 256 * MIB };

/// An entry's name is the lowercase SHA-256 the frontend derives from its
/// format, build, kind and key; never a path.
pub fn valid_key(key: &str) -> bool {
    key.len() == 64 && key.bytes().all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
fn entry(dir: &Path, key: &str) -> PathBuf { dir.join(format!("{key}.bin")) }

/// The entry's bytes, or none. Reading marks the entry as recently used.
pub fn read(dir: &Path, key: &str, limits: Limits) -> Result<Option<Vec<u8>>, String> {
    if !valid_key(key) { return Err("Invalid derived cache entry".into()); }
    let mut file = match fs::OpenOptions::new().read(true).write(true).open(entry(dir, key)) {
        Ok(file) => file,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };
    if file.metadata().map_err(|e| e.to_string())?.len() > limits.entry_bytes { return Ok(None); }
    let mut data = Vec::new();
    file.read_to_end(&mut data).map_err(|e| e.to_string())?;
    // A failure here only lets the entry age.
    let _ = file.set_modified(SystemTime::now());
    Ok(Some(data))
}

/// Store an entry, dropping the least recently used others until it fits the
/// budget. False, with nothing written, when it cannot fit or the disk is low.
pub fn write(dir: &Path, key: &str, data: &[u8], limits: Limits, free_space: impl Fn(&Path) -> io::Result<u64>) -> Result<bool, String> {
    if !valid_key(key) { return Err("Invalid derived cache entry".into()); }
    let size = data.len() as u64;
    if size > limits.entry_bytes || size > limits.budget_bytes { return Ok(false); }
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    // Never fill the disk: under the floor the cache only reads.
    match free_space(dir) {
        Ok(free) if free >= limits.free_space_floor_bytes.saturating_add(size) => {}
        _ => return Ok(false),
    }
    let target = entry(dir, key);
    let mut entries = Vec::new();
    for item in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let Ok(item) = item else { continue };
        let path = item.path();
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else { continue };
        // A write interrupted before its rename leaves a pending file.
        if name.ends_with(".pending") { let _ = fs::remove_file(&path); continue; }
        if path == target || !name.strip_suffix(".bin").is_some_and(valid_key) { continue; }
        let Ok(meta) = item.metadata() else { continue };
        entries.push((meta.modified().unwrap_or(SystemTime::UNIX_EPOCH), meta.len(), path));
    }
    let mut total: u64 = entries.iter().map(|e| e.1).sum();
    entries.sort();
    for (_, len, path) in entries {
        if total.saturating_add(size) <= limits.budget_bytes { break; }
        // An entry in use elsewhere stays and still counts.
        if fs::remove_file(&path).is_ok() { total -= len; }
    }
    if total.saturating_add(size) > limits.budget_bytes { return Ok(false); }
    let pending = dir.join(format!("{key}.pending"));
    if let Err(e) = fs::write(&pending, data).and_then(|_| fs::rename(&pending, &target)) {
        let _ = fs::remove_file(&pending);
        return Err(e.to_string());
    }
    Ok(true)
}

/// The earlier cache's twelve fixed slot files in the managed directory hold
/// derived data only; they are dropped, not migrated.
pub fn remove_earlier_slots(managed: &Path) {
    for slot in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b"] {
        let _ = fs::remove_file(managed.join(format!("viewer-derived-cache-v1-slot-{slot}.bin")));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    fn dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("derived-cache-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }
    const PLENTY: fn(&Path) -> io::Result<u64> = |_| Ok(u64::MAX / 2);
    fn key(n: u8) -> String { format!("{n:02x}").repeat(32) }
    fn small(budget: u64) -> Limits { Limits { budget_bytes: budget, free_space_floor_bytes: 100, entry_bytes: 50 } }
    fn age(dir: &Path, k: &str, seconds: u64) {
        let file = fs::OpenOptions::new().write(true).open(entry(dir, k)).unwrap();
        file.set_modified(SystemTime::now() - Duration::from_secs(seconds)).unwrap();
    }

    #[test]
    fn entries_round_trip_and_a_missing_one_is_none() {
        let d = dir("round-trip");
        assert_eq!(read(&d, &key(1), LIMITS), Ok(None));
        assert_eq!(write(&d, &key(1), b"derived", LIMITS, PLENTY), Ok(true));
        assert_eq!(read(&d, &key(1), LIMITS), Ok(Some(b"derived".to_vec())));
        assert_eq!(write(&d, &key(1), b"replaced", LIMITS, PLENTY), Ok(true));
        assert_eq!(read(&d, &key(1), LIMITS), Ok(Some(b"replaced".to_vec())));
        fs::remove_dir_all(&d).unwrap();
    }
    #[test]
    fn only_digest_names_are_entries() {
        let d = dir("names");
        for wrong in ["", "../library", &"A".repeat(64), &"a".repeat(63), &"a".repeat(65), &format!("{}.bin", "a".repeat(60)), &"g".repeat(64)] {
            assert!(read(&d, wrong, LIMITS).is_err(), "read {wrong}");
            assert!(write(&d, wrong, b"x", LIMITS, PLENTY).is_err(), "wrote {wrong}");
        }
        assert!(!d.exists());
    }
    #[test]
    fn the_least_recently_used_entries_go_first_when_over_budget() {
        let d = dir("lru");
        for n in 1..=3 { assert_eq!(write(&d, &key(n), &[n; 30], small(100), PLENTY), Ok(true)); }
        age(&d, &key(1), 300); age(&d, &key(2), 200); age(&d, &key(3), 100);
        // Reading the oldest makes it the newest.
        assert!(read(&d, &key(1), small(100)).unwrap().is_some());
        assert_eq!(write(&d, &key(4), &[4; 30], small(100), PLENTY), Ok(true));
        assert!(read(&d, &key(2), small(100)).unwrap().is_none(), "the least recently used entry is dropped");
        for n in [1, 3, 4] { assert!(read(&d, &key(n), small(100)).unwrap().is_some()); }
        // Room for a larger entry is made from as many old entries as needed.
        age(&d, &key(3), 50);
        assert_eq!(write(&d, &key(5), &[5; 50], small(100), PLENTY), Ok(true));
        let left: Vec<u8> = (1..=5).filter(|&n| read(&d, &key(n), small(100)).unwrap().is_some()).collect();
        let total: usize = left.iter().map(|&n| if n == 5 { 50 } else { 30 }).sum();
        assert!(total <= 100 && left.contains(&5), "{left:?}");
        assert!(!left.contains(&3), "{left:?}");
        fs::remove_dir_all(&d).unwrap();
    }
    #[test]
    fn a_low_disk_or_oversized_entry_writes_nothing() {
        let d = dir("refusals");
        assert_eq!(write(&d, &key(1), &[1; 30], small(100), |_| Ok(129)), Ok(false), "under the floor plus the entry");
        assert_eq!(write(&d, &key(1), &[1; 30], small(100), |_| Err(io::Error::other("unknown"))), Ok(false), "unknown free space");
        assert_eq!(write(&d, &key(1), &[1; 51], small(100), PLENTY), Ok(false), "over the entry ceiling");
        assert_eq!(read(&d, &key(1), small(100)), Ok(None));
        assert_eq!(write(&d, &key(1), &[1; 30], small(100), |_| Ok(130)), Ok(true));
        // An entry larger than its ceiling on disk is not read back.
        fs::write(entry(&d, &key(2)), [2; 51]).unwrap();
        assert_eq!(read(&d, &key(2), small(100)), Ok(None));
        fs::remove_dir_all(&d).unwrap();
    }
    #[test]
    fn pending_files_and_foreign_names_are_not_counted() {
        let d = dir("foreign");
        fs::create_dir_all(&d).unwrap();
        fs::write(d.join(format!("{}.pending", key(9))), [0; 90]).unwrap();
        fs::write(d.join("notes.txt"), [0; 90]).unwrap();
        assert_eq!(write(&d, &key(1), &[1; 50], small(100), PLENTY), Ok(true));
        assert!(!d.join(format!("{}.pending", key(9))).exists());
        assert!(d.join("notes.txt").exists(), "a file the cache did not write is left alone");
        fs::remove_dir_all(&d).unwrap();
    }
    #[test]
    fn the_earlier_slot_files_are_removed_and_nothing_else() {
        let d = dir("earlier");
        fs::create_dir_all(&d).unwrap();
        for slot in ["0", "9", "b"] { fs::write(d.join(format!("viewer-derived-cache-v1-slot-{slot}.bin")), b"slot").unwrap(); }
        for kept in ["library.json", "viewer-derived-cache-v1.json", "viewer-derived-cache-v1-slot-c.bin"] { fs::write(d.join(kept), b"kept").unwrap(); }
        remove_earlier_slots(&d);
        for slot in ["0", "9", "b"] { assert!(!d.join(format!("viewer-derived-cache-v1-slot-{slot}.bin")).exists()); }
        for kept in ["library.json", "viewer-derived-cache-v1.json", "viewer-derived-cache-v1-slot-c.bin"] { assert!(d.join(kept).exists()); }
        remove_earlier_slots(&d);
        fs::remove_dir_all(&d).unwrap();
    }
}
