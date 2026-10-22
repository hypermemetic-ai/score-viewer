//! Streamed, exact-original piano bank admission. No frontend paths or buffers.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, AtomicU64, Ordering},
};
use zip::ZipArchive;

pub const ARCHIVE_BYTES: u64 = 1_658_825_437;
pub const ARCHIVE_SHA256: &str = "03d9a02da210ea0f5968ead11c8e764b3ddde1ea0cba5a0432e1f094905cbb35";
pub const LIVE_PATH: &str = "sfz_live/Accurate-SalamanderGrandPiano_flat.Recommended.sfz";
pub const LIVE_SHA256: &str = "6567611a435eb3503b5425f13c1092de4abec32fa237c6cf7f0467949ec729ee";
// Sorted UTF-8 path + NUL + decimal bytes + NUL + lowercase SHA256 + LF.
// Derived from the CRC/hash-verified original archive inventory, not audio data.
const MANIFEST_SHA256: &str = "417f2d4c3f872fc2595ff6090009ef899981d1ac631b16cbb64fb083c7d5befc";
const CACHE_PREFIX: &str = "v6.2-03d9a02da210ea0f5-";
const CURRENT: &str = "current.json";
const MARKER: &str = ".piano-admission.json";
const BUFFER: usize = 256 * 1024;
const RESERVE: u64 = 256 * 1024 * 1024;
static SERIAL: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Member {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}
#[derive(Serialize, Deserialize)]
struct Manifest {
    version: u8,
    archive_sha256: String,
    archive_bytes: u64,
    files: Vec<Member>,
}
#[derive(Serialize, Deserialize)]
struct Pointer {
    version: u8,
    directory: String,
}

#[derive(Clone)]
struct Profile<'a> {
    /// Cache directory prefix naming this archive's identity.
    prefix: &'a str,
    bytes: u64,
    archive_sha256: &'a str,
    live: &'a str,
    live_sha256: &'a str,
    manifest_sha256: &'a str,
    raw: u64,
    files: usize,
    samples: usize,
}
const ORIGINAL: Profile<'static> = Profile {
    prefix: CACHE_PREFIX,
    bytes: ARCHIVE_BYTES,
    archive_sha256: ARCHIVE_SHA256,
    live: LIVE_PATH,
    live_sha256: LIVE_SHA256,
    manifest_sha256: MANIFEST_SHA256,
    raw: 1_969_529_132,
    files: 716,
    samples: 641,
};
/// The author replaced V6.2 with V6.2a; the official mirrors now serve only
/// V6.2a. Both are admitted, so an installed V6.2 bank stays installed.
const CURRENT_RELEASE: Profile<'static> = Profile {
    prefix: "v6.2a-3bc8623b598d7d854-",
    bytes: 1_663_231_006,
    archive_sha256: "3bc8623b598d7d854a14228c2f7c0e4a7970b118e8b056e39e221b8334678350",
    live: LIVE_PATH,
    live_sha256: "aeeaac5b68a83f1c52af5dcd2d198f300ce8a5a251957909b42d286c846c57b1",
    manifest_sha256: "0251a6d5237d4588fa371e040bfe7a0209fe7d2c38884d1567f3fe37a8ab80e2",
    raw: 1_969_543_216,
    files: 716,
    samples: 641,
};
const PROFILES: [&Profile<'static>; 2] = [&CURRENT_RELEASE, &ORIGINAL];
/// The author's own archive.org copy of V6.2a, linked from
/// https://www.ir.isas.jaxa.jp/~cyamauch/AccurateSalamander/ (CC BY 3.0).
pub const DOWNLOAD_URL: &str = "https://archive.org/download/httpswww.ir.isas.jaxa.jpcyamauchaccuratesalamander/AccurateSalamanderGrandPianoV6.2a_48khz24bit.zip";
pub const DOWNLOAD_BYTES: u64 = CURRENT_RELEASE.bytes;

fn err(e: impl std::fmt::Display) -> String {
    format!("Piano installation could not finish: {e}")
}
fn cancelled(flag: &AtomicBool) -> Result<(), String> {
    if flag.load(Ordering::Acquire) {
        Err("Piano installation cancelled.".into())
    } else {
        Ok(())
    }
}
fn hex(bytes: impl AsRef<[u8]>) -> String {
    bytes.as_ref().iter().map(|b| format!("{b:02x}")).collect()
}
fn digest_text(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|x| x.is_ascii_digit() || (b'a'..=b'f').contains(&x))
}

pub fn safe_member(name: &str) -> Result<PathBuf, String> {
    if name.is_empty()
        || name.len() > 220
        || name.starts_with('/')
        || name.contains('\\')
        || name.chars().any(|c| c.is_control() || c == ':')
    {
        return Err("Unsafe piano ZIP path.".into());
    }
    let mut result = PathBuf::new();
    for part in name.trim_end_matches('/').split('/') {
        let base = part.split('.').next().unwrap_or("").to_ascii_uppercase();
        if part.is_empty()
            || matches!(part, "." | "..")
            || part.ends_with(['.', ' '])
            || matches!(base.as_str(), "CON" | "PRN" | "AUX" | "NUL")
            || (base.len() == 4
                && (base.starts_with("COM") || base.starts_with("LPT"))
                && matches!(base.as_bytes()[3], b'1'..=b'9'))
        {
            return Err("Unsafe piano ZIP path.".into());
        }
        result.push(part);
    }
    Ok(result)
}

fn ordinary(path: &Path, directory: bool) -> Result<(), String> {
    let m = fs::symlink_metadata(path).map_err(err)?;
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if m.file_attributes() & 0x400 != 0 {
            return Err("Piano cache contains a redirected path.".into());
        }
    }
    if m.file_type().is_symlink() || if directory { !m.is_dir() } else { !m.is_file() } {
        return Err("Piano cache contains an unsupported path.".into());
    }
    Ok(())
}
fn prepare_root(root: &Path) -> Result<PathBuf, String> {
    match fs::create_dir(root) {
        Ok(()) => (),
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => (),
        Err(e) => return Err(err(e)),
    }
    ordinary(root, true)?;
    fs::canonicalize(root).map_err(err)
}
fn checked_path(root: &Path, name: &str) -> Result<PathBuf, String> {
    let relative = safe_member(name)?;
    let mut path = root.to_path_buf();
    let parts: Vec<_> = relative.iter().collect();
    for (i, p) in parts.iter().enumerate() {
        path.push(p);
        ordinary(&path, i + 1 < parts.len())?;
    }
    Ok(path)
}
fn json<T: for<'a> Deserialize<'a>>(path: &Path, max: u64) -> Result<T, String> {
    ordinary(path, false)?;
    if fs::metadata(path).map_err(err)?.len() > max {
        return Err("Piano cache marker is too large.".into());
    }
    serde_json::from_reader(File::open(path).map_err(err)?).map_err(err)
}
fn hash_file(path: &Path, limit: u64, cancel: &AtomicBool) -> Result<(u64, String), String> {
    let mut input = File::open(path).map_err(err)?;
    let mut buffer = vec![0; BUFFER];
    let mut hash = Sha256::new();
    let mut bytes = 0u64;
    loop {
        cancelled(cancel)?;
        let n = input.read(&mut buffer).map_err(err)?;
        if n == 0 {
            break;
        }
        bytes = bytes
            .checked_add(n as u64)
            .ok_or("Piano file size overflow")?;
        if bytes > limit {
            return Err("Piano file exceeds its admitted size.".into());
        }
        hash.update(&buffer[..n]);
    }
    Ok((bytes, hex(hash.finalize())))
}
fn manifest_digest(files: &[Member]) -> String {
    let mut files: Vec<_> = files.iter().collect();
    files.sort_by(|a, b| a.path.cmp(&b.path));
    let mut h = Sha256::new();
    for x in files {
        h.update(x.path.as_bytes());
        h.update([0]);
        h.update(x.bytes.to_string().as_bytes());
        h.update([0]);
        h.update(x.sha256.as_bytes());
        h.update(b"\n");
    }
    hex(h.finalize())
}
fn manifest_valid(m: &Manifest, p: &Profile) -> Result<(), String> {
    if m.version != 1
        || m.archive_sha256 != p.archive_sha256
        || m.archive_bytes != p.bytes
        || m.files.len() != p.files
        || manifest_digest(&m.files) != p.manifest_sha256
    {
        return Err("Piano cache identity differs from the original bank.".into());
    }
    let mut names = HashSet::new();
    let mut total = 0u64;
    for x in &m.files {
        safe_member(&x.path)?;
        if !names.insert(x.path.to_ascii_lowercase())
            || !digest_text(&x.sha256)
            || x.bytes > 64 * 1024 * 1024
        {
            return Err("Invalid piano cache member.".into());
        }
        total = total
            .checked_add(x.bytes)
            .ok_or("Piano cache size overflow")?;
    }
    if total != p.raw {
        return Err("Piano cache size differs.".into());
    }
    Ok(())
}

fn sfz_samples(
    root: &Path,
    name: &str,
    members: &HashSet<String>,
) -> Result<HashSet<String>, String> {
    let path = checked_path(root, name)?;
    if fs::metadata(&path).map_err(err)?.len() > 1_000_000 {
        return Err("Piano SFZ is too large.".into());
    }
    let bytes = fs::read(&path).map_err(err)?;
    let text = std::str::from_utf8(&bytes).map_err(err)?;
    let mut cleaned = String::new();
    let mut block = false;
    for line in text.lines() {
        let mut rest = line;
        while !rest.is_empty() {
            if block {
                if let Some(end) = rest.find("*/") {
                    rest = &rest[end + 2..];
                    block = false;
                } else {
                    break;
                }
            } else {
                let comment = rest.find("//");
                let start = rest.find("/*");
                match (comment, start) {
                    (Some(a), Some(b)) if b < a => {
                        cleaned.push_str(&rest[..b]);
                        rest = &rest[b + 2..];
                        block = true;
                    }
                    (_, Some(b)) if comment.is_none() => {
                        cleaned.push_str(&rest[..b]);
                        rest = &rest[b + 2..];
                        block = true;
                    }
                    (Some(a), _) => {
                        cleaned.push_str(&rest[..a]);
                        break;
                    }
                    _ => {
                        cleaned.push_str(rest);
                        break;
                    }
                }
            }
        }
        cleaned.push('\n');
    }
    if block
        || cleaned
            .lines()
            .any(|line| line.trim_start().starts_with('#'))
        || cleaned.contains("default_path=")
        || cleaned.contains("image=")
    {
        return Err("Unsupported piano SFZ include/path syntax.".into());
    }
    let base: Vec<String> = Path::new(name)
        .parent()
        .unwrap()
        .components()
        .map(|x| x.as_os_str().to_string_lossy().into_owned())
        .collect();
    let mut samples = HashSet::new();
    for token in cleaned
        .split_whitespace()
        .filter_map(|x| x.strip_prefix("sample="))
    {
        if token.is_empty() || token.starts_with('/') || token.contains([':', '$', '"']) {
            return Err("Invalid piano sample reference.".into());
        }
        let mut parts = base.clone();
        for part in token.replace('\\', "/").split('/') {
            match part {
                ".." => {
                    if parts.pop().is_none() {
                        return Err("Piano sample escapes its bank.".into());
                    }
                }
                "." => (),
                "" => return Err("Invalid piano sample reference.".into()),
                p => parts.push(p.into()),
            }
        }
        let reference = parts.join("/");
        if !reference.ends_with(".wav") || !members.contains(&reference) {
            return Err("Piano SFZ sample is missing.".into());
        }
        checked_path(root, &reference)?;
        samples.insert(reference);
    }
    if samples.is_empty() {
        return Err("Piano SFZ has no samples.".into());
    }
    Ok(samples)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use zip::{write::FileOptions, ZipWriter};
    struct Fixture {
        dir: PathBuf,
        source: PathBuf,
        archive_hash: String,
        live_hash: String,
        manifest_hash: String,
        raw: u64,
        files: usize,
        bytes: u64,
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.dir);
        }
    }
    impl Fixture {
        fn make(extra: Option<&str>, sfz: &str, patch: impl FnOnce(&mut Vec<u8>)) -> Self {
            let dir = std::env::temp_dir().join(format!("piano-fixture-{}", nonce()));
            fs::create_dir(&dir).unwrap();
            let mut members = vec![
                ("sfz_live/test.sfz", sfz.as_bytes()),
                ("48khz24bit/tone.wav", b"synthetic audio fixture".as_slice()),
                ("README.orig.txt", b"original attribution".as_slice()),
                ("README.txt", b"source attribution".as_slice()),
            ];
            if let Some(name) = extra {
                members.push((name, b"fixture"));
            }
            let files: Vec<_> = members
                .iter()
                .map(|(path, data)| Member {
                    path: (*path).into(),
                    bytes: data.len() as u64,
                    sha256: hex(Sha256::digest(data)),
                })
                .collect();
            let raw = files.iter().map(|x| x.bytes).sum();
            let mut zip = ZipWriter::new(Cursor::new(Vec::new()));
            for (name, data) in members {
                zip.start_file(
                    name,
                    FileOptions::default()
                        .compression_method(zip::CompressionMethod::Stored)
                        .unix_permissions(0o644),
                )
                .unwrap();
                zip.write_all(data).unwrap();
            }
            let mut bytes = zip.finish().unwrap().into_inner();
            patch(&mut bytes);
            let source = dir.join("piano.zip");
            fs::write(&source, &bytes).unwrap();
            Self {
                dir,
                source,
                archive_hash: hex(Sha256::digest(&bytes)),
                live_hash: hex(Sha256::digest(sfz.as_bytes())),
                manifest_hash: manifest_digest(&files),
                raw,
                files: files.len(),
                bytes: bytes.len() as u64,
            }
        }
        fn valid() -> Self {
            Self::make(None, "<region> sample=..\\48khz24bit\\tone.wav", |_| ())
        }
        fn profile(&self) -> Profile<'_> {
            Profile {
                prefix: CACHE_PREFIX,
                bytes: self.bytes,
                archive_sha256: &self.archive_hash,
                live: "sfz_live/test.sfz",
                live_sha256: &self.live_hash,
                manifest_sha256: &self.manifest_hash,
                raw: self.raw,
                files: self.files,
                samples: 1,
            }
        }
        fn root(&self) -> PathBuf {
            self.dir.join("cache")
        }
        fn install(
            &self,
            cancel: &AtomicBool,
            progress: &mut impl FnMut(&str, u8),
            free: Option<u64>,
        ) -> Result<PathBuf, String> {
            install_impl(
                &self.source,
                &self.root(),
                &self.profile(),
                cancel,
                progress,
                free,
            )
        }
    }
    fn quiet(_: &str, _: u8) {}
    fn stage_count(root: &Path) -> usize {
        fs::read_dir(root)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|x| x.file_name().to_string_lossy().starts_with("pending-"))
            .count()
    }
    #[test]
    fn valid_archive_publishes_verified_offline_bank_and_notices() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        assert_eq!(
            fs::read_to_string(&sfz).unwrap(),
            "<region> sample=..\\48khz24bit\\tone.wav"
        );
        assert_eq!(
            verify_impl(&f.root(), &[&f.profile()], &stop, &mut quiet).unwrap(),
            Some(sfz)
        );
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn unsafe_paths_are_rejected_on_both_native_platforms() {
        for name in [
            "../escape",
            "/absolute",
            "C:drive",
            "a\\b",
            "a/../b",
            "a/./b",
            "a//b",
            "a/NUL.wav",
            "a/COM1.txt",
            "a/trailing.",
            "a/trailing ",
        ] {
            assert!(safe_member(name).is_err(), "{name}");
        }
        assert!(safe_member("48khz24bit/030_F#1v16.wav").is_ok());
        let f = Fixture::make(Some("../escape"), "sample=..\\48khz24bit\\tone.wav", |_| ());
        assert!(f
            .install(&AtomicBool::new(false), &mut quiet, None)
            .is_err());
        assert!(!f.root().join(CURRENT).exists());
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn central_directory_symlink_and_oversized_member_are_rejected() {
        for oversized in [false, true] {
            let f = Fixture::make(None, "sample=..\\48khz24bit\\tone.wav", |bytes| {
                let at = bytes.windows(4).position(|x| x == b"PK\x01\x02").unwrap();
                if oversized {
                    bytes[at + 24..at + 28]
                        .copy_from_slice(&(64u32 * 1024 * 1024 + 1).to_le_bytes());
                } else {
                    bytes[at + 5] = 3;
                    bytes[at + 38..at + 42].copy_from_slice(&(0o120777u32 << 16).to_le_bytes());
                }
            });
            assert!(f
                .install(&AtomicBool::new(false), &mut quiet, None)
                .is_err());
            assert!(!f.root().join(CURRENT).exists());
            assert_eq!(stage_count(&f.root()), 0);
        }
    }
    #[test]
    fn duplicate_case_paths_and_file_ancestor_collisions_do_not_publish() {
        for extra in ["48khz24bit/TONE.wav", "48khz24bit"] {
            let f = Fixture::make(Some(extra), "sample=..\\48khz24bit\\tone.wav", |_| ());
            assert!(f
                .install(&AtomicBool::new(false), &mut quiet, None)
                .is_err());
            assert!(!f.root().join(CURRENT).exists());
        }
    }
    #[test]
    fn crc_failure_removes_stage_and_keeps_previous_pointer() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        f.install(&stop, &mut quiet, None).unwrap();
        let original = fs::read(f.root().join(CURRENT)).unwrap();
        let corrupt = Fixture::make(None, "sample=..\\48khz24bit\\tone.wav", |bytes| {
            let at = bytes.windows(4).position(|x| x == b"PK\x03\x04").unwrap();
            let name = u16::from_le_bytes([bytes[at + 26], bytes[at + 27]]) as usize;
            let extra = u16::from_le_bytes([bytes[at + 28], bytes[at + 29]]) as usize;
            bytes[at + 30 + name + extra] ^= 1;
        });
        assert!(install_impl(
            &corrupt.source,
            &f.root(),
            &corrupt.profile(),
            &stop,
            &mut quiet,
            None
        )
        .is_err());
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), original);
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn closure_escape_missing_samples_and_includes_are_rejected() {
        for sfz in [
            "sample=..\\..\\outside.wav",
            "sample=..\\48khz24bit\\missing.wav",
            "#include \"elsewhere.sfz\"\nsample=..\\48khz24bit\\tone.wav",
        ] {
            let f = Fixture::make(None, sfz, |_| ());
            assert!(f
                .install(&AtomicBool::new(false), &mut quiet, None)
                .is_err());
            assert!(!f.root().join(CURRENT).exists());
            assert_eq!(stage_count(&f.root()), 0);
        }
    }
    #[test]
    fn cancellation_and_disk_failure_preserve_original_installed_bank() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        let pointer = fs::read(f.root().join(CURRENT)).unwrap();
        assert!(f.install(&stop, &mut quiet, Some(0)).is_err());
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        let result = f.install(
            &stop,
            &mut |phase, _| {
                if phase == "installing" {
                    stop.store(true, Ordering::Release);
                }
            },
            None,
        );
        assert!(result.unwrap_err().contains("cancelled"));
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        assert!(sfz.exists());
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn changed_source_identity_and_corrupted_cache_are_refused() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        let pointer = fs::read(f.root().join(CURRENT)).unwrap();
        let mut source = fs::read(&f.source).unwrap();
        source[0] ^= 1;
        fs::write(&f.source, &source).unwrap();
        assert!(f.install(&stop, &mut quiet, None).is_err());
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        let sample = sfz
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("48khz24bit/tone.wav");
        fs::write(sample, b"modified audio fixture").unwrap();
        assert!(verify_impl(&f.root(), &[&f.profile()], &stop, &mut quiet).is_err());
    }
    #[test]
    fn marker_cannot_reauthorize_modified_hashes() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        let marker = sfz.parent().unwrap().parent().unwrap().join(MARKER);
        let mut m: Manifest = json(&marker, 4_000_000).unwrap();
        m.files[0].sha256 = "0".repeat(64);
        fs::write(marker, serde_json::to_vec(&m).unwrap()).unwrap();
        assert!(verify_impl(&f.root(), &[&f.profile()], &stop, &mut quiet).is_err());
    }
    fn get(
        f: &Fixture,
        cancel: &AtomicBool,
        fetch: impl FnMut(&Path, u64, &mut dyn FnMut(u64)) -> Fetch,
    ) -> Result<PathBuf, String> {
        download_impl(&f.root(), &f.profile(), cancel, &mut quiet, fetch, None)
    }
    fn part(f: &Fixture) -> PathBuf {
        f.root().join(format!("{CACHE_PREFIX}download.part"))
    }
    /// Appends `bytes[from..to]` the way curl --continue-at does.
    fn append(path: &Path, bytes: &[u8], have: u64, to: usize) {
        let mut out = OpenOptions::new().create(true).append(true).open(path).unwrap();
        out.write_all(&bytes[have as usize..to]).unwrap();
    }
    #[test]
    fn one_press_downloads_checks_and_publishes_without_a_second_archive() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let stop = AtomicBool::new(false);
        let mut phases = Vec::new();
        let sfz = download_impl(
            &f.root(),
            &f.profile(),
            &stop,
            &mut |phase: &str, _| {
                if phases.last().map(String::as_str) != Some(phase) {
                    phases.push(phase.to_string());
                }
            },
            |path, have, grew| {
                assert_eq!(have, 0);
                append(path, &source, have, source.len());
                grew(source.len() as u64);
                Fetch::Ended
            },
            None,
        )
        .unwrap();
        assert_eq!(phases, ["downloading", "checking", "installing"]);
        assert_eq!(
            verify_impl(&f.root(), &[&f.profile()], &stop, &mut quiet).unwrap(),
            Some(sfz)
        );
        assert!(!part(&f).exists(), "the archive is not kept after admission");
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn an_interrupted_download_continues_where_it_stopped() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let half = source.len() / 2;
        let mut calls = Vec::new();
        let sfz = get(&f, &AtomicBool::new(false), |path, have, _| {
            calls.push(have);
            if have == 0 {
                append(path, &source, have, half);
                Fetch::Interrupted("The piano download was interrupted.".into())
            } else {
                append(path, &source, have, source.len());
                Fetch::Ended
            }
        })
        .unwrap();
        assert_eq!(calls, [0, half as u64]);
        assert!(sfz.exists());
    }
    #[test]
    fn network_failure_keeps_the_unfinished_download_for_the_next_press() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let stop = AtomicBool::new(false);
        let mut attempts = 0;
        let error = get(&f, &stop, |path, have, _| {
            attempts += 1;
            append(path, &source, have, have as usize + 3);
            Fetch::Interrupted("Can't reach the piano download.".into())
        })
        .unwrap_err();
        assert_eq!(error, "Can't reach the piano download.");
        assert_eq!(attempts, DOWNLOAD_ATTEMPTS);
        assert_eq!(fs::metadata(part(&f)).unwrap().len(), 3 * DOWNLOAD_ATTEMPTS as u64);
        assert!(!f.root().join(CURRENT).exists());
        // The next press starts from what is already there.
        let sfz = get(&f, &stop, |path, have, _| {
            assert_eq!(have, 3 * DOWNLOAD_ATTEMPTS as u64);
            append(path, &source, have, source.len());
            Fetch::Ended
        })
        .unwrap();
        assert!(sfz.exists());
    }
    #[test]
    fn cancel_discards_the_download_and_keeps_the_installed_bank() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        let pointer = fs::read(f.root().join(CURRENT)).unwrap();
        let error = get(&f, &stop, |path, have, _| {
            append(path, &source, have, 5);
            stop.store(true, Ordering::Release);
            Fetch::Interrupted("Piano installation cancelled.".into())
        })
        .unwrap_err();
        assert!(error.contains("cancelled"));
        assert!(!part(&f).exists());
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        assert!(sfz.exists());
        // Cancelling while checking also leaves nothing behind.
        stop.store(false, Ordering::Release);
        let error = download_impl(
            &f.root(),
            &f.profile(),
            &stop,
            &mut |phase: &str, _| {
                if phase == "checking" {
                    stop.store(true, Ordering::Release);
                }
            },
            |path, have, _| {
                append(path, &source, have, source.len());
                Fetch::Ended
            },
            None,
        )
        .unwrap_err();
        assert!(error.contains("cancelled"));
        assert!(!part(&f).exists());
        assert_eq!(stage_count(&f.root()), 0);
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
    }
    #[test]
    fn a_changed_download_is_refused_and_not_kept() {
        let f = Fixture::valid();
        let mut source = fs::read(&f.source).unwrap();
        let last = source.len() - 1;
        source[last] ^= 1;
        let error = get(&f, &AtomicBool::new(false), |path, have, _| {
            append(path, &source, have, source.len());
            Fetch::Ended
        })
        .unwrap_err();
        assert!(error.contains("differs"), "{error}");
        assert!(!part(&f).exists());
        assert!(!f.root().join(CURRENT).exists());
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn server_refusal_stops_at_once_and_oversized_leftovers_restart() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let mut attempts = 0;
        let error = get(&f, &AtomicBool::new(false), |_, _, _| {
            attempts += 1;
            Fetch::Failed("The piano download isn't available right now.".into())
        })
        .unwrap_err();
        assert_eq!((attempts, error.as_str()), (1, "The piano download isn't available right now."));
        fs::create_dir_all(f.root()).unwrap();
        fs::write(part(&f), vec![0; source.len() + 1]).unwrap();
        let sfz = get(&f, &AtomicBool::new(false), |path, have, _| {
            assert_eq!(have, 0, "a leftover larger than the archive starts again");
            append(path, &source, have, source.len());
            Fetch::Ended
        })
        .unwrap();
        assert!(sfz.exists());
        // Not enough room for the rest of the download and the bank.
        let other = Fixture::valid();
        let error = download_impl(&other.root(), &other.profile(), &AtomicBool::new(false), &mut quiet, |_, _, _| unreachable!(), Some(0)).unwrap_err();
        assert!(error.contains("free space"), "{error}");
    }
    #[test]
    fn an_installed_earlier_release_stays_installed_beside_the_new_one() {
        let f = Fixture::valid();
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        let mut newer = f.profile();
        newer.prefix = "v6.2a-fixture-";
        newer.archive_sha256 = "0000000000000000000000000000000000000000000000000000000000000000";
        assert_eq!(
            verify_impl(&f.root(), &[&newer, &f.profile()], &stop, &mut quiet).unwrap(),
            Some(sfz)
        );
        assert!(present_impl(&f.root(), &[&newer, &f.profile()]).unwrap());
        assert!(verify_impl(&f.root(), &[&newer], &stop, &mut quiet).is_err());
    }
    #[test]
    fn curl_exits_read_as_plain_reasons() {
        assert!(matches!(curl_outcome(Some(0), ""), Fetch::Ended));
        for code in [Some(6), Some(7), Some(18), Some(28), Some(56), None] {
            assert!(matches!(curl_outcome(code, ""), Fetch::Interrupted(m) if m.contains("continue where it stopped")));
        }
        assert!(matches!(curl_outcome(Some(22), "curl: (22) The requested URL returned error: 503"), Fetch::Failed(m) if m.contains("(server: 503)")));
        assert!(matches!(curl_outcome(Some(23), ""), Fetch::Failed(m) if m.contains("4 GB")));
        assert!(matches!(curl_outcome(Some(60), ""), Fetch::Failed(_)));
    }
    #[test]
    fn admitted_archives_are_distinct_and_the_download_is_the_current_release() {
        assert_eq!(DOWNLOAD_BYTES, CURRENT_RELEASE.bytes);
        assert!(DOWNLOAD_URL.starts_with("https://") && DOWNLOAD_URL.ends_with("V6.2a_48khz24bit.zip"));
        assert_ne!(CURRENT_RELEASE.bytes, ORIGINAL.bytes, "a chosen ZIP's size selects its identity");
        assert!(!CURRENT_RELEASE.prefix.starts_with(ORIGINAL.prefix) && !ORIGINAL.prefix.starts_with(CURRENT_RELEASE.prefix));
        for p in PROFILES {
            assert!(digest_text(p.archive_sha256) && digest_text(p.live_sha256) && digest_text(p.manifest_sha256));
        }
    }
    #[test]
    fn presence_reads_pointer_and_marker_without_hashing() {
        let f = Fixture::valid();
        assert!(!present_impl(&f.root(), &[&f.profile()]).unwrap());
        assert!(!f.root().exists(), "asking does not create the cache");
        let stop = AtomicBool::new(false);
        let sfz = f.install(&stop, &mut quiet, None).unwrap();
        assert!(present_impl(&f.root(), &[&f.profile()]).unwrap());
        // Changed sample bytes are only found by the full check.
        let sample = sfz.parent().unwrap().parent().unwrap().join("48khz24bit/tone.wav");
        fs::write(sample, b"modified audio fixture").unwrap();
        assert!(present_impl(&f.root(), &[&f.profile()]).unwrap());
        assert!(verify_impl(&f.root(), &[&f.profile()], &stop, &mut quiet).is_err());
        fs::remove_file(&sfz).unwrap();
        assert!(present_impl(&f.root(), &[&f.profile()]).is_err());
        fs::remove_file(f.root().join(CURRENT)).unwrap();
        assert!(!present_impl(&f.root(), &[&f.profile()]).unwrap());
    }
}
fn closure(root: &Path, m: &Manifest, p: &Profile) -> Result<(), String> {
    let members: HashSet<_> = m.files.iter().map(|x| x.path.clone()).collect();
    let waves: HashSet<_> = members
        .iter()
        .filter(|x| x.ends_with(".wav"))
        .cloned()
        .collect();
    if waves.len() != p.samples || sfz_samples(root, p.live, &members)? != waves {
        return Err("Piano live SFZ sample closure differs.".into());
    }
    for x in &m.files {
        if x.path.ends_with(".sfz") {
            sfz_samples(root, &x.path, &members)?;
        }
    }
    let live = m
        .files
        .iter()
        .find(|x| x.path == p.live)
        .ok_or("Piano live SFZ is missing")?;
    if live.sha256 != p.live_sha256 {
        return Err("Piano live SFZ identity differs.".into());
    }
    for notice in ["README.orig.txt", "README.txt"] {
        if !members.contains(notice) {
            return Err("Original piano license/attribution is missing.".into());
        }
    }
    Ok(())
}

pub fn verify_installed(
    root: &Path,
    cancel: &AtomicBool,
    mut progress: impl FnMut(&str, u8),
) -> Result<Option<PathBuf>, String> {
    verify_impl(root, &PROFILES, cancel, &mut progress)
}
fn verify_impl(
    root: &Path,
    profiles: &[&Profile],
    cancel: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
) -> Result<Option<PathBuf>, String> {
    let root = prepare_root(root)?;
    let Some((bank, manifest, p)) = admitted_manifest(&root, profiles)? else {
        return Ok(None);
    };
    for (i, member) in manifest.files.iter().enumerate() {
        cancelled(cancel)?;
        let path = checked_path(&bank, &member.path)?;
        let (size, hash) = hash_file(&path, member.bytes, cancel)?;
        if size != member.bytes || hash != member.sha256 {
            return Err("Installed piano files differ. Install the original bank again.".into());
        }
        progress("checking", ((i + 1) * 100 / manifest.files.len()) as u8);
    }
    closure(&bank, &manifest, p)?;
    Ok(Some(checked_path(&bank, p.live)?))
}

/// The installed bank directory and its admitted manifest, read from the
/// pointer and marker alone; `None` when nothing is installed.
fn admitted_manifest<'p>(
    root: &Path,
    profiles: &[&'p Profile<'p>],
) -> Result<Option<(PathBuf, Manifest, &'p Profile<'p>)>, String> {
    let pointer = root.join(CURRENT);
    if !pointer.exists() {
        return Ok(None);
    }
    let pointer: Pointer = json(&pointer, 4096)?;
    let p = profiles
        .iter()
        .copied()
        .find(|p| pointer.directory.starts_with(p.prefix));
    let Some(p) = p.filter(|p| {
        pointer.version == 1
            && pointer.directory[p.prefix.len()..]
                .bytes()
                .all(|x| x.is_ascii_digit() || x == b'-')
            && pointer.directory.len() <= 100
    }) else {
        return Err("Piano cache pointer differs.".into());
    };
    safe_member(&pointer.directory)?;
    let bank = root.join(pointer.directory);
    ordinary(&bank, true)?;
    let manifest: Manifest = json(&bank.join(MARKER), 4_000_000)?;
    manifest_valid(&manifest, p)?;
    Ok(Some((bank, manifest, p)))
}
/// Whether a bank is installed, from its pointer, marker and live SFZ alone.
/// Nothing is hashed, so this answers at once; the full check runs when the
/// piano is turned on.
pub fn installed_present(root: &Path) -> bool {
    present_impl(root, &PROFILES).unwrap_or(false)
}
fn present_impl(root: &Path, profiles: &[&Profile]) -> Result<bool, String> {
    if fs::symlink_metadata(root).is_err() {
        return Ok(false);
    }
    ordinary(root, true)?;
    let root = fs::canonicalize(root).map_err(err)?;
    let Some((bank, _, p)) = admitted_manifest(&root, profiles)? else {
        return Ok(false);
    };
    checked_path(&bank, p.live)?;
    Ok(true)
}

struct OwnedDirectory(Option<PathBuf>);
impl Drop for OwnedDirectory {
    fn drop(&mut self) {
        if let Some(path) = self.0.take() {
            let _ = fs::remove_dir_all(path);
        }
    }
}
fn nonce() -> String {
    format!(
        "{}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
        SERIAL.fetch_add(1, Ordering::Relaxed)
    )
}
fn enough_space(available: u64, required: u64) -> Result<(), String> {
    if available < required.saturating_add(RESERVE) {
        Err("Not enough free space to install piano. Free about 4 GB and try again.".into())
    } else {
        Ok(())
    }
}
fn write_json(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let mut f = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(err)?;
    serde_json::to_writer(&mut f, value).map_err(err)?;
    f.write_all(b"\n").map_err(err)?;
    f.sync_all().map_err(err)
}
fn replace_file(source: &Path, target: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn MoveFileExW(a: *const u16, b: *const u16, flags: u32) -> i32;
        }
        let a: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
        let b: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
        if unsafe { MoveFileExW(a.as_ptr(), b.as_ptr(), 1 | 8) } == 0 {
            return Err(err(std::io::Error::last_os_error()));
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        fs::rename(source, target).map_err(err)
    }
}

/// Install from a ZIP the player already has. Its size selects which admitted
/// archive it must be; its bytes are then checked against that archive.
pub fn install(
    source: &Path,
    root: &Path,
    cancel: &AtomicBool,
    mut progress: impl FnMut(&str, u8),
) -> Result<PathBuf, String> {
    let size = fs::metadata(source).map_err(err)?.len();
    let p = PROFILES
        .iter()
        .find(|p| p.bytes == size)
        .ok_or("Choose the Accurate-Salamander V6.2a 48 kHz/24-bit ZIP (the WAV one, not FLAC).")?;
    install_impl(source, root, p, cancel, &mut progress, None)
}
fn install_impl(
    source: &Path,
    root: &Path,
    p: &Profile,
    cancel: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
    test_free: Option<u64>,
) -> Result<PathBuf, String> {
    cancelled(cancel)?;
    ordinary(source, false)?;
    if fs::metadata(source).map_err(err)?.len() != p.bytes {
        return Err("Choose the Accurate-Salamander V6.2a 48 kHz/24-bit ZIP (the WAV one, not FLAC).".into());
    }
    let root = prepare_root(root)?;
    enough_space(
        test_free.unwrap_or(fs2::available_space(&root).map_err(err)?),
        p.bytes.checked_add(p.raw).ok_or("Piano size overflow")?,
    )?;
    let id = nonce();
    let stage = root.join(format!("pending-{id}"));
    fs::create_dir(&stage).map_err(err)?;
    let _guard = OwnedDirectory(Some(stage.clone()));
    let snapshot = stage.join("source.zip");
    let mut output = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&snapshot)
        .map_err(err)?;
    let mut input = File::open(source).map_err(err)?;
    let mut hash = Sha256::new();
    let mut bytes = 0u64;
    let mut buffer = vec![0; BUFFER];
    loop {
        cancelled(cancel)?;
        let n = input.read(&mut buffer).map_err(err)?;
        if n == 0 {
            break;
        }
        bytes = bytes.checked_add(n as u64).ok_or("Piano size overflow")?;
        if bytes > p.bytes {
            return Err("Piano download size differs.".into());
        }
        output.write_all(&buffer[..n]).map_err(err)?;
        hash.update(&buffer[..n]);
        progress("checking", (bytes.saturating_mul(100) / p.bytes) as u8);
    }
    output.sync_all().map_err(err)?;
    drop(output);
    drop(input);
    if bytes != p.bytes || hex(hash.finalize()) != p.archive_sha256 {
        return Err("This ZIP differs from the author's original piano, so it was not installed.".into());
    }
    admit(&root, &stage, &snapshot, &id, p, cancel, progress, test_free)
}

/// What one download attempt reports.
pub enum Fetch {
    /// The transfer ended without an error; the file's length says how far.
    Ended,
    /// A transient failure: the next attempt continues the same file.
    Interrupted(String),
    /// A failure another attempt would repeat.
    Failed(String),
}
const DOWNLOAD_ATTEMPTS: usize = 4;
/// The system's own curl appends to the unfinished file: /usr/bin/curl on
/// macOS, System32 curl.exe on Windows 10 1803 and later. No new network
/// stack is bundled. HTTPS only, including redirects.
fn curl() -> PathBuf {
    #[cfg(windows)]
    {
        PathBuf::from(std::env::var_os("SystemRoot").unwrap_or_else(|| "C:\\Windows".into()))
            .join("System32")
            .join("curl.exe")
    }
    #[cfg(not(windows))]
    {
        PathBuf::from("/usr/bin/curl")
    }
}
pub fn curl_fetch(part: &Path, cancel: &AtomicBool, grew: &mut dyn FnMut(u64)) -> Fetch {
    use std::process::{Command, Stdio};
    let mut command = Command::new(curl());
    command
        .args([
            "--fail",
            "--location",
            "--silent",
            "--show-error",
            "--proto",
            "=https",
            "--proto-redir",
            "=https",
            "--connect-timeout",
            "30",
            "--speed-limit",
            "4096",
            "--speed-time",
            "60",
            "--continue-at",
            "-",
            "--output",
        ])
        .arg(part)
        .arg(DOWNLOAD_URL)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => {
            return Fetch::Failed(
                "This computer can't download the piano by itself. Use Install from a file… with the Accurate-Salamander V6.2a ZIP.".into(),
            )
        }
    };
    let status = loop {
        if cancel.load(Ordering::Acquire) {
            let _ = child.kill();
            let _ = child.wait();
            return Fetch::Interrupted("Piano installation cancelled.".into());
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if let Ok(m) = std::fs::metadata(part) {
                    grew(m.len());
                }
                std::thread::sleep(std::time::Duration::from_millis(250));
            }
            Err(error) => return Fetch::Failed(format!("Piano download failed: {error}")),
        }
    };
    let mut detail = String::new();
    if let Some(stderr) = child.stderr.take() {
        use std::io::Read;
        let _ = stderr.take(4096).read_to_string(&mut detail);
    }
    let outcome = curl_outcome(status.code(), detail.trim());
    if matches!(outcome, Fetch::Interrupted(_)) {
        // A moment before the next attempt continues the file.
        for _ in 0..8 {
            if cancel.load(Ordering::Acquire) {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(250));
        }
    }
    outcome
}
/// Pianist-facing meaning of a curl exit. Network trouble keeps the
/// unfinished file so the next attempt or press continues it.
pub fn curl_outcome(code: Option<i32>, detail: &str) -> Fetch {
    const AGAIN: &str = "Press Download piano to continue where it stopped.";
    match code {
        Some(0) => Fetch::Ended,
        Some(6 | 7) => Fetch::Interrupted(format!(
            "Can't reach the piano download. Check the internet connection. {AGAIN}"
        )),
        Some(16 | 18 | 28 | 35 | 52 | 55 | 56 | 92) | None => {
            Fetch::Interrupted(format!("The piano download was interrupted. {AGAIN}"))
        }
        Some(22) => Fetch::Failed(format!(
            "The piano download isn't available right now{}. Try again later.",
            detail
                .rsplit("error: ")
                .next()
                .filter(|x| x.len() < 80 && x.chars().any(|c| c.is_ascii_digit()))
                .map(|x| format!(" (server: {x})"))
                .unwrap_or_default()
        )),
        Some(23) => Fetch::Failed(
            "The piano download could not be saved. Free about 4 GB and try again.".into(),
        ),
        Some(51 | 58 | 60 | 77 | 83 | 90 | 91) => Fetch::Failed(
            "The download server's identity could not be checked, so the piano was not downloaded.".into(),
        ),
        Some(code) => Fetch::Interrupted(format!(
            "The piano download stopped (curl {code}). {AGAIN}"
        )),
    }
}
/// One press: download the author's archive into the viewer's own piano
/// folder, continuing a download an earlier press left unfinished, then
/// admit it exactly as a chosen ZIP would be. `fetch` appends to the file
/// from its current length and reports the length as it grows. Cancel
/// discards the unfinished download; an interruption keeps it.
pub fn download(
    root: &Path,
    cancel: &AtomicBool,
    mut progress: impl FnMut(&str, u8),
    fetch: impl FnMut(&Path, u64, &mut dyn FnMut(u64)) -> Fetch,
) -> Result<PathBuf, String> {
    download_impl(root, &CURRENT_RELEASE, cancel, &mut progress, fetch, None)
}
fn length(path: &Path) -> Result<u64, String> {
    match fs::symlink_metadata(path) {
        Ok(m) if m.is_file() => Ok(m.len()),
        Ok(_) => Err("Piano download path is not an ordinary file.".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(0),
        Err(e) => Err(err(e)),
    }
}
fn download_impl(
    root: &Path,
    p: &Profile,
    cancel: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
    mut fetch: impl FnMut(&Path, u64, &mut dyn FnMut(u64)) -> Fetch,
    test_free: Option<u64>,
) -> Result<PathBuf, String> {
    cancelled(cancel)?;
    let root = prepare_root(root)?;
    let part = root.join(format!("{}download.part", p.prefix));
    let discard = |message: String| {
        let _ = fs::remove_file(&part);
        message
    };
    if length(&part)? > p.bytes {
        fs::remove_file(&part).map_err(err)?;
    }
    let have = length(&part)?;
    enough_space(
        test_free.unwrap_or(fs2::available_space(&root).map_err(err)?),
        (p.bytes - have).checked_add(p.raw).ok_or("Piano size overflow")?,
    )?;
    let mut reason = String::new();
    for _ in 0..DOWNLOAD_ATTEMPTS {
        let have = length(&part)?;
        if have >= p.bytes {
            break;
        }
        progress("downloading", (have.saturating_mul(100) / p.bytes) as u8);
        let outcome = fetch(&part, have, &mut |now| {
            progress("downloading", (now.min(p.bytes).saturating_mul(100) / p.bytes) as u8)
        });
        cancelled(cancel).map_err(discard)?;
        match outcome {
            Fetch::Ended => reason.clear(),
            Fetch::Interrupted(why) => reason = why,
            Fetch::Failed(why) => return Err(why),
        }
        if length(&part)? > p.bytes {
            return Err(discard("The piano download is larger than expected. Press Download piano to start again.".into()));
        }
    }
    if length(&part)? != p.bytes {
        return Err(if reason.is_empty() {
            "The piano download stopped early. Press Download piano to continue where it stopped.".into()
        } else {
            reason
        });
    }
    install_owned(&part, &root, p, cancel, progress, test_free)
}
/// Admit a complete download the viewer itself made. It is moved, not
/// copied, into the staging directory, so the disk holds one archive.
fn install_owned(
    part: &Path,
    root: &Path,
    p: &Profile,
    cancel: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
    test_free: Option<u64>,
) -> Result<PathBuf, String> {
    cancelled(cancel)?;
    ordinary(part, false)?;
    let id = nonce();
    let stage = root.join(format!("pending-{id}"));
    fs::create_dir(&stage).map_err(err)?;
    let _guard = OwnedDirectory(Some(stage.clone()));
    let snapshot = stage.join("source.zip");
    fs::rename(part, &snapshot).map_err(err)?;
    let mut input = File::open(&snapshot).map_err(err)?;
    let mut hash = Sha256::new();
    let mut bytes = 0u64;
    let mut buffer = vec![0; BUFFER];
    loop {
        cancelled(cancel)?;
        let n = input.read(&mut buffer).map_err(err)?;
        if n == 0 {
            break;
        }
        bytes = bytes.checked_add(n as u64).ok_or("Piano size overflow")?;
        if bytes > p.bytes {
            return Err("Piano download size differs.".into());
        }
        hash.update(&buffer[..n]);
        progress("checking", (bytes.saturating_mul(100) / p.bytes) as u8);
    }
    drop(input);
    if bytes != p.bytes || hex(hash.finalize()) != p.archive_sha256 {
        return Err("The downloaded piano differs from the one this viewer knows, so it was not installed. Press Download piano to try again.".into());
    }
    admit(root, &stage, &snapshot, &id, p, cancel, progress, test_free)
}
#[allow(clippy::too_many_arguments)]
fn admit(
    root: &Path,
    stage: &Path,
    snapshot: &Path,
    id: &str,
    p: &Profile,
    cancel: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
    test_free: Option<u64>,
) -> Result<PathBuf, String> {
    let mut buffer = vec![0; BUFFER];
    let mut zip = ZipArchive::new(File::open(snapshot).map_err(err)?).map_err(err)?;
    if zip.len() > 10_000 {
        return Err("Too many piano ZIP entries.".into());
    }
    let mut names = HashSet::new();
    let mut file_names = HashSet::new();
    let mut raw = 0u64;
    for i in 0..zip.len() {
        cancelled(cancel)?;
        let member = zip.by_index(i).map_err(err)?;
        safe_member(member.name())?;
        let mode = member.unix_mode().unwrap_or(0) & 0o170000;
        if !matches!(mode, 0 | 0o100000 | 0o040000) {
            return Err("Piano ZIP contains a symlink or special file.".into());
        }
        if member.size() > 64 * 1024 * 1024
            || !matches!(
                member.compression(),
                zip::CompressionMethod::Stored | zip::CompressionMethod::Deflated
            )
        {
            return Err("Unsupported piano ZIP member.".into());
        }
        let name = member.name().trim_end_matches('/').to_ascii_lowercase();
        if !names.insert(name.clone()) {
            return Err("Duplicate piano ZIP path.".into());
        }
        if !member.is_dir() {
            file_names.insert(name);
        }
        raw = raw
            .checked_add(member.size())
            .ok_or("Piano ZIP size overflow")?;
        if raw > 3 * 1024 * 1024 * 1024 {
            return Err("Piano ZIP expands beyond its limit.".into());
        }
    }
    if raw != p.raw || file_names.len() != p.files {
        return Err("Piano ZIP inventory differs.".into());
    }
    for name in &names {
        let mut parent = Path::new(name).parent();
        while let Some(path) = parent {
            if file_names.contains(path.to_string_lossy().as_ref()) {
                return Err("Piano ZIP path collides with a file.".into());
            }
            parent = path.parent();
        }
    }
    enough_space(
        test_free.unwrap_or(fs2::available_space(&root).map_err(err)?),
        raw,
    )?;
    let payload = stage.join("payload");
    fs::create_dir(&payload).map_err(err)?;
    let mut files = Vec::new();
    let mut done = 0u64;
    for i in 0..zip.len() {
        cancelled(cancel)?;
        let mut member = zip.by_index(i).map_err(err)?;
        let target = payload.join(safe_member(member.name())?);
        if member.is_dir() {
            fs::create_dir_all(&target).map_err(err)?;
            continue;
        }
        fs::create_dir_all(target.parent().unwrap()).map_err(err)?;
        let mut out = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&target)
            .map_err(err)?;
        let mut h = Sha256::new();
        let mut nbytes = 0u64;
        loop {
            cancelled(cancel)?;
            let n = member.read(&mut buffer).map_err(err)?;
            if n == 0 {
                break;
            }
            nbytes = nbytes
                .checked_add(n as u64)
                .ok_or("Piano member overflow")?;
            if nbytes > member.size() {
                return Err("Piano member expanded beyond its admitted size.".into());
            }
            out.write_all(&buffer[..n]).map_err(err)?;
            h.update(&buffer[..n]);
            done += n as u64;
            progress("installing", (done.saturating_mul(100) / raw.max(1)) as u8);
        }
        if nbytes != member.size() {
            return Err("Piano member size differs.".into());
        }
        out.sync_all().map_err(err)?;
        files.push(Member {
            path: member.name().into(),
            bytes: nbytes,
            sha256: hex(h.finalize()),
        });
    }
    drop(zip);
    let manifest = Manifest {
        version: 1,
        archive_sha256: p.archive_sha256.into(),
        archive_bytes: p.bytes,
        files,
    };
    manifest_valid(&manifest, p)?;
    closure(&payload, &manifest, p)?;
    write_json(&payload.join(MARKER), &manifest)?;
    cancelled(cancel)?;
    let directory = format!("{}{id}", p.prefix);
    let final_dir = root.join(&directory);
    fs::rename(&payload, &final_dir).map_err(err)?;
    let mut publication = OwnedDirectory(Some(final_dir.clone()));
    cancelled(cancel)?;
    let pointer = stage.join("pointer.json");
    write_json(
        &pointer,
        &Pointer {
            version: 1,
            directory,
        },
    )?;
    replace_file(&pointer, &root.join(CURRENT))?;
    publication.0 = None;
    Ok(final_dir.join(p.live))
}
