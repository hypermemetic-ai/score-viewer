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
    fn same(f: &Fixture) -> Result<Remote, Fetch> {
        Ok(Remote {
            bytes: Some(f.bytes),
            validator: Some("etag \"first\"".into()),
        })
    }
    fn get(
        f: &Fixture,
        cancel: &AtomicBool,
        fetch: impl FnMut(&Attempt, &mut dyn FnMut(u64)) -> Fetch,
    ) -> Result<PathBuf, String> {
        let keep = AtomicBool::new(false);
        download_impl(&f.root(), &f.profile(), cancel, &keep, &mut quiet, || same(f), fetch, None)
    }
    fn part(f: &Fixture) -> PathBuf {
        f.root().join(format!("{CACHE_PREFIX}download.part"))
    }
    fn out(a: &Attempt) -> PathBuf {
        a.dir.join(a.name)
    }
    /// Appends `bytes[from..to]` the way curl --continue-at does.
    fn append(path: &Path, bytes: &[u8], have: u64, to: usize) {
        let mut out = OpenOptions::new().create(true).append(true).open(path).unwrap();
        out.write_all(&bytes[have as usize..to]).unwrap();
    }
    fn whole(source: &[u8]) -> impl FnMut(&Attempt, &mut dyn FnMut(u64)) -> Fetch + '_ {
        move |a, _| {
            append(&out(a), source, a.have, source.len());
            Fetch::Ended
        }
    }
    fn never(_: &Attempt, _: &mut dyn FnMut(u64)) -> Fetch {
        unreachable!("nothing is downloaded")
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
            &AtomicBool::new(false),
            &mut |phase: &str, _| {
                if phases.last().map(String::as_str) != Some(phase) {
                    phases.push(phase.to_string());
                }
            },
            || same(&f),
            |a, grew| {
                assert_eq!(a.have, 0);
                assert_eq!(a.bytes, f.bytes);
                append(&out(a), &source, a.have, source.len());
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
        assert!(!f.root().join(format!("{CACHE_PREFIX}download.json")).exists());
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn an_interrupted_download_continues_where_it_stopped() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let half = source.len() / 2;
        let mut calls = Vec::new();
        let sfz = get(&f, &AtomicBool::new(false), |a, _| {
            calls.push(a.have);
            if a.have == 0 {
                append(&out(a), &source, a.have, half);
                Fetch::Interrupted("The piano download was interrupted.".into())
            } else {
                append(&out(a), &source, a.have, source.len());
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
        let error = get(&f, &stop, |a, _| {
            attempts += 1;
            append(&out(a), &source, a.have, a.have as usize + 3);
            Fetch::Interrupted("Can't reach the piano download.".into())
        })
        .unwrap_err();
        assert_eq!(error, "Can't reach the piano download.");
        assert_eq!(attempts, DOWNLOAD_ATTEMPTS);
        assert_eq!(fs::metadata(part(&f)).unwrap().len(), 3 * DOWNLOAD_ATTEMPTS as u64);
        assert!(!f.root().join(CURRENT).exists());
        // The next press starts from what is already there.
        let sfz = get(&f, &stop, |a, _| {
            assert_eq!(a.have, 3 * DOWNLOAD_ATTEMPTS as u64);
            append(&out(a), &source, a.have, source.len());
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
        let error = get(&f, &stop, |a, _| {
            append(&out(a), &source, a.have, 5);
            stop.store(true, Ordering::Release);
            Fetch::Interrupted("Piano installation cancelled.".into())
        })
        .unwrap_err();
        assert!(error.contains("cancelled"));
        assert!(!part(&f).exists());
        assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        assert!(sfz.exists());
        // Cancelling while checking or installing also leaves nothing behind.
        for at in ["checking", "installing"] {
            stop.store(false, Ordering::Release);
            let error = download_impl(
                &f.root(),
                &f.profile(),
                &stop,
                &AtomicBool::new(false),
                &mut |phase: &str, _| {
                    if phase == at {
                        stop.store(true, Ordering::Release);
                    }
                },
                || same(&f),
                whole(&source),
                None,
            )
            .unwrap_err();
            assert!(error.contains("cancelled"), "{at}: {error}");
            assert!(!part(&f).exists(), "{at}");
            assert_eq!(stage_count(&f.root()), 0, "{at}");
            assert_eq!(fs::read(f.root().join(CURRENT)).unwrap(), pointer);
        }
    }
    #[test]
    fn quitting_keeps_the_unfinished_download_and_costs_nothing_next_time() {
        // Finding 1: the viewer quits mid-download.
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let (stop, keep) = (AtomicBool::new(false), AtomicBool::new(false));
        let error = download_impl(
            &f.root(),
            &f.profile(),
            &stop,
            &keep,
            &mut quiet,
            || same(&f),
            |a, _| {
                append(&out(a), &source, a.have, 7);
                keep.store(true, Ordering::Release);
                stop.store(true, Ordering::Release);
                Fetch::Interrupted("Piano installation cancelled.".into())
            },
            None,
        )
        .unwrap_err();
        assert!(error.contains("cancelled"));
        assert_eq!(fs::metadata(part(&f)).unwrap().len(), 7, "the quit keeps what arrived");
        // Finding 2: the viewer quits while checking, then while installing.
        // Neither costs a download nor leaves a second copy.
        for at in ["checking", "installing"] {
            stop.store(false, Ordering::Release);
            keep.store(false, Ordering::Release);
            let mut fetched = 0;
            let error = download_impl(
                &f.root(),
                &f.profile(),
                &stop,
                &keep,
                &mut |phase: &str, _| {
                    if phase == at {
                        keep.store(true, Ordering::Release);
                        stop.store(true, Ordering::Release);
                    }
                },
                || same(&f),
                |a, _| {
                    fetched += 1;
                    append(&out(a), &source, a.have, source.len());
                    Fetch::Ended
                },
                None,
            )
            .unwrap_err();
            assert!(error.contains("cancelled"), "{at}: {error}");
            assert_eq!(fetched, if at == "checking" { 1 } else { 0 }, "{at}");
            assert_eq!(fs::metadata(part(&f)).unwrap().len(), f.bytes, "{at}: kept in place");
            assert_eq!(stage_count(&f.root()), 0, "{at}: no second copy");
        }
        stop.store(false, Ordering::Release);
        keep.store(false, Ordering::Release);
        let sfz = download_impl(&f.root(), &f.profile(), &stop, &keep, &mut quiet, || same(&f), never, None).unwrap();
        assert!(sfz.exists());
        assert!(!part(&f).exists());
    }
    #[test]
    fn a_stage_left_by_a_quit_is_reused_or_removed() {
        // Finding 2: an earlier build moved the complete download into a stage.
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let stage = f.root().join("pending-1-2-3");
        fs::create_dir_all(stage.join("payload/sfz_live")).unwrap();
        fs::write(stage.join("source.zip"), &source).unwrap();
        fs::write(stage.join("payload/sfz_live/test.sfz"), b"half extracted").unwrap();
        let other = f.root().join("pending-4-5-6");
        fs::create_dir_all(other.join("payload")).unwrap();
        let stop = AtomicBool::new(false);
        let sfz = get(&f, &stop, never).unwrap();
        assert!(sfz.exists());
        assert_eq!(stage_count(&f.root()), 0);
        assert!(!part(&f).exists());
        // Installing from a file sweeps stale stages too.
        fs::create_dir_all(other.join("payload")).unwrap();
        f.install(&stop, &mut quiet, None).unwrap();
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn a_live_writer_keeps_every_other_press_out() {
        // Finding 1: another copy of the viewer (or the curl it left) holds the lock.
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let root = prepare_root(&f.root()).unwrap();
        fs::write(part(&f), &source[..9]).unwrap();
        let held = exclusive(&root).unwrap();
        let error = get(&f, &AtomicBool::new(false), never).unwrap_err();
        assert_eq!(error, BUSY);
        assert!(f.install(&AtomicBool::new(false), &mut quiet, None).unwrap_err() == BUSY);
        assert_eq!(fs::metadata(part(&f)).unwrap().len(), 9, "never appended to");
        drop(held);
        assert!(get(&f, &AtomicBool::new(false), whole(&source)).unwrap().exists());
    }
    #[test]
    fn a_changed_download_is_refused_and_not_kept() {
        let f = Fixture::valid();
        let mut source = fs::read(&f.source).unwrap();
        let last = source.len() - 1;
        source[last] ^= 1;
        let error = get(&f, &AtomicBool::new(false), whole(&source)).unwrap_err();
        assert!(error.contains("online has changed") && error.contains("Install from a file"), "{error}");
        assert!(!error.contains("try again"));
        assert!(!part(&f).exists());
        assert!(!f.root().join(CURRENT).exists());
        assert_eq!(stage_count(&f.root()), 0);
    }
    #[test]
    fn a_changed_file_online_is_found_before_downloading() {
        // Finding 3: the server's size differs from the admitted archive.
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        fs::create_dir_all(f.root()).unwrap();
        fs::write(part(&f), &source[..4]).unwrap();
        let error = download_impl(
            &f.root(),
            &f.profile(),
            &AtomicBool::new(false),
            &AtomicBool::new(false),
            &mut quiet,
            || {
                Ok(Remote {
                    bytes: Some(f.bytes + 1),
                    validator: None,
                })
            },
            never,
            None,
        )
        .unwrap_err();
        assert_eq!(error, changed("downloaded"));
        assert!(!part(&f).exists(), "the unusable part is not kept");
        // A file uploaded again with the same size: the old part is not spliced onto it.
        fs::write(part(&f), &source[..4]).unwrap();
        fs::write(f.root().join(format!("{CACHE_PREFIX}download.json")), "etag \"old\"").unwrap();
        let mut starts = Vec::new();
        get(&f, &AtomicBool::new(false), |a, _| {
            starts.push(a.have);
            append(&out(a), &source, a.have, source.len());
            Fetch::Ended
        })
        .unwrap();
        assert_eq!(starts, [0]);
        // A response larger than the archive stops at once.
        let other = Fixture::valid();
        let error = get(&other, &AtomicBool::new(false), |a, _| {
            append(&out(a), &vec![0; other.bytes as usize + 1], a.have, other.bytes as usize + 1);
            Fetch::Ended
        })
        .unwrap_err();
        assert_eq!(error, changed("downloaded"));
        assert!(!part(&other).exists());
    }
    #[test]
    fn a_rejected_resume_starts_again_once() {
        // Finding 4: curl 33/36 or HTTP 416 on a kept part.
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        fs::create_dir_all(f.root()).unwrap();
        fs::write(part(&f), &source[..6]).unwrap();
        let mut starts = Vec::new();
        let sfz = get(&f, &AtomicBool::new(false), |a, _| {
            starts.push(a.have);
            if a.have > 0 {
                return Fetch::Restart;
            }
            append(&out(a), &source, a.have, source.len());
            Fetch::Ended
        })
        .unwrap();
        assert_eq!(starts, [6, 0]);
        assert!(sfz.exists());
        // Refused again after starting over: plain words, nothing kept.
        let other = Fixture::valid();
        fs::create_dir_all(other.root()).unwrap();
        fs::write(part(&other), &source[..6]).unwrap();
        let error = get(&other, &AtomicBool::new(false), |_, _| Fetch::Restart).unwrap_err();
        assert!(error.contains("start it again") && !error.contains("curl"), "{error}");
        assert!(!part(&other).exists());
    }
    #[test]
    fn server_refusal_stops_at_once_and_oversized_leftovers_restart() {
        let f = Fixture::valid();
        let source = fs::read(&f.source).unwrap();
        let mut attempts = 0;
        let error = get(&f, &AtomicBool::new(false), |_, _| {
            attempts += 1;
            Fetch::Failed("The piano download isn't available right now.".into())
        })
        .unwrap_err();
        assert_eq!((attempts, error.as_str()), (1, "The piano download isn't available right now."));
        fs::create_dir_all(f.root()).unwrap();
        fs::write(part(&f), vec![0; source.len() + 1]).unwrap();
        let sfz = get(&f, &AtomicBool::new(false), |a, _| {
            assert_eq!(a.have, 0, "a leftover larger than the archive starts again");
            append(&out(a), &source, a.have, source.len());
            Fetch::Ended
        })
        .unwrap();
        assert!(sfz.exists());
        // An unreachable server is reported before anything is fetched.
        let other = Fixture::valid();
        let error = download_impl(
            &other.root(),
            &other.profile(),
            &AtomicBool::new(false),
            &AtomicBool::new(false),
            &mut quiet,
            || Err(Fetch::Interrupted("Can't reach the piano download.".into())),
            never,
            None,
        )
        .unwrap_err();
        assert_eq!(error, "Can't reach the piano download.");
        // Not enough room for the rest of the download and the bank.
        let error = download_impl(
            &other.root(),
            &other.profile(),
            &AtomicBool::new(false),
            &AtomicBool::new(false),
            &mut quiet,
            || same(&other),
            never,
            Some(0),
        )
        .unwrap_err();
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
        // Finding 4: a refused resume starts again rather than keeping the part forever.
        for (code, detail) in [
            (33, "curl: (33) HTTP server doesn't seem to support byte ranges. Cannot resume."),
            (36, "curl: (36) Bad download resume"),
            (22, "curl: (22) The requested URL returned error: 416"),
            (22, "curl: (22) The requested URL returned error: 416 Requested Range Not Satisfiable"),
        ] {
            assert!(matches!(curl_outcome(Some(code), detail), Fetch::Restart), "{detail}");
        }
        assert!(matches!(curl_outcome(Some(22), "curl: (22) The requested URL returned error: 404"), Fetch::Failed(m) if m.contains("Install from a file")));
        assert!(matches!(curl_outcome(Some(63), "curl: (63) Maximum file size exceeded"), Fetch::Failed(m) if m.contains("online has changed")));
        assert!(matches!(curl_outcome(Some(23), ""), Fetch::Failed(m) if m.contains("4 GB")));
        assert!(matches!(curl_outcome(Some(60), ""), Fetch::Failed(_)));
        // No curl or HTTP numbers reach the pianist.
        for code in (0..100).map(Some).chain([None]) {
            for detail in ["", "curl: (22) The requested URL returned error: 503", "curl: (22) The requested URL returned error: 500 Internal"] {
                if let Fetch::Interrupted(m) | Fetch::Failed(m) = curl_outcome(code, detail) {
                    let plain = m.replace(INSTALL_FROM_FILE, "").replace("4 GB", "");
                    assert!(!plain.contains("curl") && !plain.chars().any(|c| c.is_ascii_digit()), "{code:?} {detail}: {m}");
                }
            }
        }
    }
    #[test]
    fn the_server_reply_gives_size_and_validator() {
        // archive.org's reply on 2026-10-22, redirect included.
        let head = "HTTP/2 302 \r\nlocation: https://ia801908.us.archive.org/0/items/x/y.zip\r\naccept-ranges: bytes\r\n\r\nHTTP/2 200 \r\ncontent-length: 1663231006\r\nlast-modified: Tue, 13 Oct 2026 17:18:28 GMT\r\netag: \"6ace67e4-6322e41e\"\r\naccept-ranges: bytes\r\n\r\n";
        let remote = remote_from_head(head);
        assert_eq!(remote.bytes, Some(CURRENT_RELEASE.bytes));
        assert_eq!(remote.validator.as_deref(), Some("etag \"6ace67e4-6322e41e\""));
        let remote = remote_from_head("HTTP/1.1 200 OK\nLast-Modified: Thu, 15 Oct 2026 08:00:00 GMT\n\n");
        assert_eq!((remote.bytes, remote.validator.as_deref()), (None, Some("last-modified Thu, 15 Oct 2026 08:00:00 GMT")));
        assert!(remote_from_head("").bytes.is_none());
    }
    #[test]
    fn curl_gets_only_ascii_arguments_and_works_in_the_piano_folder() {
        // Finding 5: a Windows user name outside the system code page never
        // reaches curl.exe's arguments; the folder goes as the working directory.
        assert_eq!(plain_directory(r"\\?\C:\Users\Zoë\AppData\Roaming\x\piano"), r"C:\Users\Zoë\AppData\Roaming\x\piano");
        assert_eq!(plain_directory(r"\\?\UNC\server\share\piano"), r"\\?\UNC\server\share\piano");
        assert_eq!(plain_directory("/Users/zoë/piano"), "/Users/zoë/piano");
        let dir = std::env::temp_dir().join(format!("piano-Zoë-用户-{}", nonce()));
        fs::create_dir(&dir).unwrap();
        let lock = File::create(dir.join(LOCK)).unwrap();
        let attempt = Attempt { dir: &dir, name: "v6.2a-3bc8623b598d7d854-download.part", have: 0, bytes: CURRENT_RELEASE.bytes, lock: &lock };
        let command = fetch_command(&curl(), &attempt, 1);
        assert_eq!(command.get_current_dir(), Some(dir.as_path()));
        let args: Vec<_> = command.get_args().map(|a| a.to_str().unwrap().to_string()).collect();
        let from = args.iter().position(|a| a == "--disable").unwrap();
        for arg in &args[from..] {
            assert!(arg.is_ascii() && !arg.contains(dir.to_str().unwrap()), "{arg}");
        }
        assert!(args.windows(2).any(|w| w == ["--max-filesize", CURRENT_RELEASE.bytes.to_string().as_str()]));
        assert!(args.windows(2).any(|w| w == ["--output", attempt.name]));
        fs::remove_dir_all(dir).unwrap();
    }
    /// A stand-in curl that appends to its --output file until stopped.
    #[cfg(unix)]
    fn endless_curl(dir: &Path) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        let program = dir.join("fake-curl");
        fs::write(&program, "#!/bin/sh\nout=\nwhile [ $# -gt 0 ]; do [ \"$1\" = --output ] && out=$2; shift; done\nwhile :; do printf x >> \"$out\"; sleep 0.05; done\n").unwrap();
        fs::set_permissions(&program, fs::Permissions::from_mode(0o755)).unwrap();
        program
    }
    #[cfg(unix)]
    fn settles(path: &Path) -> bool {
        let before = fs::metadata(path).unwrap().len();
        std::thread::sleep(std::time::Duration::from_millis(600));
        fs::metadata(path).unwrap().len() == before
    }
    #[test]
    #[cfg(unix)]
    fn cancel_stops_curl_and_its_watcher_at_once() {
        // Finding 1: Cancel and Quit stop the transfer, not just the wait for it.
        let f = Fixture::valid();
        let root = prepare_root(&f.root()).unwrap();
        let lock = exclusive(&root).unwrap();
        let program = endless_curl(&f.dir);
        let cancel = AtomicBool::new(false);
        let name = "fixture.part";
        let started = std::time::Instant::now();
        let outcome = std::thread::scope(|scope| {
            scope.spawn(|| {
                std::thread::sleep(std::time::Duration::from_millis(700));
                cancel.store(true, Ordering::Release);
            });
            let attempt = Attempt { dir: &root, name, have: 0, bytes: 1 << 30, lock: &lock };
            fetch_with(&program, &attempt, std::process::id(), &cancel, &mut |_| ())
        });
        assert!(matches!(outcome, Fetch::Interrupted(m) if m.contains("cancelled")));
        assert!(started.elapsed() < std::time::Duration::from_secs(3));
        assert!(fs::metadata(root.join(name)).unwrap().len() > 0);
        assert!(settles(&root.join(name)), "nothing writes after Cancel");
        drop(lock);
        drop(exclusive(&root).unwrap());
    }
    #[test]
    #[cfg(unix)]
    fn curl_ends_with_the_viewer_and_holds_the_lock_until_then() {
        // Finding 1: the viewer is killed mid-download.
        use std::process::{Command, Stdio};
        let f = Fixture::valid();
        let root = prepare_root(&f.root()).unwrap();
        let program = endless_curl(&f.dir);
        // Stands in for the viewer's process.
        let mut viewer = Command::new("/bin/sleep").arg("60").spawn().unwrap();
        let lock = exclusive(&root).unwrap();
        let attempt = Attempt { dir: &root, name: "fixture.part", have: 0, bytes: 1 << 30, lock: &lock };
        let mut command = fetch_command(&program, &attempt, viewer.id());
        command.stderr(Stdio::null());
        let mut curl = command.spawn().unwrap();
        // Only curl and its watcher hold the lock now.
        drop(command);
        drop(lock);
        std::thread::sleep(std::time::Duration::from_millis(400));
        // The viewer's own lock handle is gone; the live writer still keeps others out.
        assert_eq!(exclusive(&root).unwrap_err(), BUSY);
        assert!(!settles(&root.join("fixture.part")), "still writing while the viewer lives");
        viewer.kill().unwrap();
        viewer.wait().unwrap();
        let ended = std::time::Instant::now();
        while curl.try_wait().unwrap().is_none() {
            assert!(ended.elapsed() < std::time::Duration::from_secs(5), "curl outlived the viewer");
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        assert!(settles(&root.join("fixture.part")), "nothing writes after the viewer ends");
        drop(exclusive(&root).unwrap());
    }
    #[test]
    fn admitted_archives_are_distinct_and_the_download_is_the_current_release() {
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
    let _lock = exclusive(&root)?;
    sweep(&root, p);
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
    /// The server would not continue the unfinished file (curl 33 or 36,
    /// HTTP 416). It is discarded and the download starts again, once.
    Restart,
}
/// What the server says about the piano file before anything is fetched.
#[derive(Default)]
pub struct Remote {
    pub bytes: Option<u64>,
    /// ETag, else Last-Modified; it changes whenever the file is uploaded again.
    pub validator: Option<String>,
}
/// One fetch attempt: append to `name` inside `dir` from `have` bytes.
pub struct Attempt<'a> {
    pub dir: &'a Path,
    pub name: &'a str,
    /// curl finds this itself (`--continue-at -`); test fetchers resume from it.
    #[cfg_attr(not(test), allow(dead_code))]
    pub have: u64,
    pub bytes: u64,
    /// The piano lock. On macOS the curl child holds it too, so a curl that
    /// outlives a killed viewer still keeps every other press out.
    pub lock: &'a File,
}
const DOWNLOAD_ATTEMPTS: usize = 4;
const LOCK: &str = "piano.lock";
const BUSY: &str = "Another copy of the viewer is downloading or installing the piano. Wait for it to finish, or quit it, then press Download piano again.";
const INSTALL_FROM_FILE: &str =
    "Use Install from a file… with the Accurate-Salamander V6.2a 48 kHz/24-bit ZIP.";
/// archive.org re-uploaded files in this item on 2026-10-13 and 2026-10-15;
/// a later upload may not be the archive this viewer admits.
fn changed(outcome: &str) -> String {
    format!("The piano file online has changed since this viewer was made, so it was not {outcome}. {INSTALL_FROM_FILE}")
}
/// One piano operation at a time across every copy of the viewer. The lock
/// is released when its holders end, however they end.
fn exclusive(root: &Path) -> Result<File, String> {
    use fs2::FileExt;
    let path = root.join(LOCK);
    if fs::symlink_metadata(&path).is_ok() {
        ordinary(&path, false)?;
    }
    let file = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(&path)
        .map_err(err)?;
    // A curl a killed viewer left behind stops within about a second.
    for _ in 0..12 {
        if file.try_lock_exclusive().is_ok() {
            return Ok(file);
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    Err(BUSY.into())
}
/// With the lock held nothing else is installing, so a stage a quit or crash
/// left behind is removed. A complete archive inside one (an earlier build
/// moved the download there) becomes the unfinished download again, to be
/// checked rather than fetched.
fn sweep(root: &Path, p: &Profile) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    let part = root.join(format!("{}download.part", p.prefix));
    for entry in entries.flatten() {
        let path = entry.path();
        if !entry.file_name().to_string_lossy().starts_with("pending-")
            || ordinary(&path, true).is_err()
        {
            continue;
        }
        let archive = path.join("source.zip");
        if ordinary(&archive, false).is_ok()
            && length(&archive).ok() == Some(p.bytes)
            && length(&part).is_ok_and(|have| have < p.bytes)
        {
            let _ = replace_file(&archive, &part);
        }
        let _ = fs::remove_dir_all(&path);
    }
}
/// Windows: an unfinished download another process still has open is never
/// appended to or moved.
fn unattended(part: &Path) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        match OpenOptions::new().read(true).share_mode(0).open(part) {
            Ok(_) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) if e.raw_os_error() == Some(32) => Err(BUSY.into()),
            Err(e) => Err(err(e)),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = part;
        Ok(())
    }
}
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
/// `\\?\C:\…` as `C:\…`: a working directory a child process accepts.
fn plain_directory(path: &str) -> &str {
    match path.strip_prefix(r"\\?\") {
        Some(rest)
            if rest.len() >= 3
                && rest.as_bytes()[0].is_ascii_alphabetic()
                && &rest[1..3] == ":\\" =>
        {
            rest
        }
        _ => path,
    }
}
/// curl stops with the viewer, however the viewer ends. On macOS a small
/// /bin/sh watcher stops curl within a second of the viewer's process
/// disappearing (there is no parent-death signal); curl runs in its own
/// process group so Cancel and Quit stop the watcher and curl together.
#[cfg(unix)]
const WATCH: &str = r#"p=$1; shift; "$@" & c=$!; (while kill -0 "$p" 2>/dev/null; do sleep 1; done; kill "$c" 2>/dev/null) >/dev/null 2>&1 & w=$!; wait "$c"; s=$?; kill "$w" 2>/dev/null; exit "$s""#;
/// A curl invocation in `dir`, ending with `parent`. Paths are passed
/// relative to `dir` so the arguments stay ASCII: the working directory
/// reaches Windows as UTF-16 whatever the user's name, while curl.exe's
/// arguments may pass through the system code page.
fn curl_command(program: &Path, dir: &Path, parent: u32) -> std::process::Command {
    use std::process::{Command, Stdio};
    #[cfg(unix)]
    let mut command = {
        use std::os::unix::process::CommandExt;
        let mut command = Command::new("/bin/sh");
        command
            .arg("-c")
            .arg(WATCH)
            .arg("sh")
            .arg(parent.to_string())
            .arg(program);
        command.process_group(0);
        command
    };
    #[cfg(windows)]
    let mut command = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let _ = parent;
        let mut command = Command::new(program);
        command.creation_flags(CREATE_NO_WINDOW);
        command
    };
    command
        .current_dir(dir.to_str().map(plain_directory).map_or(dir, Path::new))
        // `--disable` first: no personal curl configuration applies.
        .args([
            "--disable",
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
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    command
}
/// Windows: a job that ends curl when the viewer's last handle to it closes,
/// including when the viewer is killed.
#[cfg(windows)]
struct Job(*mut std::ffi::c_void);
#[cfg(windows)]
impl Job {
    fn contain(child: &std::process::Child) -> Option<Job> {
        use std::{ffi::c_void, os::windows::io::AsRawHandle};
        #[repr(C)]
        #[derive(Default)]
        struct Basic {
            per_process_user_time: i64,
            per_job_user_time: i64,
            limit_flags: u32,
            minimum_working_set: usize,
            maximum_working_set: usize,
            active_process_limit: u32,
            affinity: usize,
            priority_class: u32,
            scheduling_class: u32,
        }
        #[repr(C)]
        #[derive(Default)]
        struct Extended {
            basic: Basic,
            io: [u64; 6],
            process_memory_limit: usize,
            job_memory_limit: usize,
            peak_process_memory: usize,
            peak_job_memory: usize,
        }
        #[cfg(target_pointer_width = "64")]
        const _: () = assert!(std::mem::size_of::<Extended>() == 144);
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn CreateJobObjectW(attributes: *const c_void, name: *const u16) -> *mut c_void;
            fn SetInformationJobObject(
                job: *mut c_void,
                class: i32,
                info: *const c_void,
                length: u32,
            ) -> i32;
            fn AssignProcessToJobObject(job: *mut c_void, process: *mut c_void) -> i32;
        }
        const EXTENDED_LIMIT_INFORMATION: i32 = 9;
        const KILL_ON_JOB_CLOSE: u32 = 0x2000;
        let job = Job(unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) });
        if job.0.is_null() {
            return None;
        }
        let mut limits = Extended::default();
        limits.basic.limit_flags = KILL_ON_JOB_CLOSE;
        let ok = unsafe {
            SetInformationJobObject(
                job.0,
                EXTENDED_LIMIT_INFORMATION,
                &limits as *const Extended as *const c_void,
                std::mem::size_of::<Extended>() as u32,
            ) != 0
                && AssignProcessToJobObject(job.0, child.as_raw_handle() as *mut c_void) != 0
        };
        ok.then_some(job)
    }
}
#[cfg(windows)]
impl Drop for Job {
    fn drop(&mut self) {
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
        }
        unsafe {
            CloseHandle(self.0);
        }
    }
}
/// Stop curl and, on macOS, its watcher.
fn stop_child(child: &mut std::process::Child) {
    #[cfg(unix)]
    {
        unsafe extern "C" {
            fn kill(pid: i32, signal: i32) -> i32;
        }
        unsafe {
            kill(-(child.id() as i32), 9);
        }
    }
    let _ = child.kill();
    let _ = child.wait();
}
/// Run curl until it ends or the press is cancelled or the viewer quits,
/// reporting the output file's length as it grows.
fn run_curl(
    mut command: std::process::Command,
    cancel: &AtomicBool,
    output: Option<&Path>,
    grew: &mut dyn FnMut(u64),
) -> Result<(Option<i32>, String, Vec<u8>), Fetch> {
    let mut child = command.spawn().map_err(|_| {
        Fetch::Failed(format!(
            "This computer can't download the piano by itself. {INSTALL_FROM_FILE}"
        ))
    })?;
    #[cfg(windows)]
    let _job = Job::contain(&child);
    let mut stdout = Vec::new();
    let reader = child.stdout.take().map(|mut out| {
        std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = (&mut out).take(64 * 1024).read_to_end(&mut bytes);
            bytes
        })
    });
    let status = loop {
        if cancel.load(Ordering::Acquire) {
            stop_child(&mut child);
            return Err(Fetch::Interrupted("Piano installation cancelled.".into()));
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if let Some(m) = output.and_then(|o| fs::metadata(o).ok()) {
                    grew(m.len());
                }
                std::thread::sleep(std::time::Duration::from_millis(250));
            }
            Err(_) => {
                stop_child(&mut child);
                return Err(Fetch::Interrupted(format!(
                    "The piano download stopped. {AGAIN}"
                )));
            }
        }
    };
    if let Some(reader) = reader {
        stdout = reader.join().unwrap_or_default();
    }
    let mut detail = String::new();
    if let Some(stderr) = child.stderr.take() {
        let _ = stderr.take(4096).read_to_string(&mut detail);
    }
    Ok((status.code(), detail.trim().to_string(), stdout))
}
const AGAIN: &str = "Press Download piano to continue where it stopped.";
/// Ask the server for the file's size and validator, without fetching it.
pub fn curl_probe(dir: &Path, cancel: &AtomicBool) -> Result<Remote, Fetch> {
    probe_with(&curl(), dir, std::process::id(), cancel)
}
fn probe_with(program: &Path, dir: &Path, parent: u32, cancel: &AtomicBool) -> Result<Remote, Fetch> {
    let mut command = curl_command(program, dir, parent);
    command
        .args(["--head", "--max-time", "60"])
        .arg(DOWNLOAD_URL)
        .stdout(std::process::Stdio::piped());
    let (code, detail, stdout) = run_curl(command, cancel, None, &mut |_| ())?;
    match curl_outcome(code, &detail) {
        Fetch::Ended => Ok(remote_from_head(&String::from_utf8_lossy(&stdout))),
        // A server that refuses HEAD alone does not stop the download.
        Fetch::Restart => Ok(Remote::default()),
        other => Err(other),
    }
}
/// Size and validator of the last response in `curl --head --location` output.
fn remote_from_head(text: &str) -> Remote {
    let lines: Vec<_> = text.lines().collect();
    let last = lines
        .iter()
        .rposition(|line| line.starts_with("HTTP/"))
        .map_or(&[][..], |i| &lines[i..]);
    let header = |name: &str| {
        last.iter().find_map(|line| {
            let (key, value) = line.split_once(':')?;
            key.trim()
                .eq_ignore_ascii_case(name)
                .then(|| value.trim().to_string())
                .filter(|v| !v.is_empty() && v.len() < 200)
        })
    };
    Remote {
        bytes: header("content-length").and_then(|v| v.parse().ok()),
        validator: header("etag")
            .map(|v| format!("etag {v}"))
            .or_else(|| header("last-modified").map(|v| format!("last-modified {v}"))),
    }
}
/// Append to the unfinished download, refusing anything larger than the archive.
pub fn curl_fetch(attempt: &Attempt, cancel: &AtomicBool, grew: &mut dyn FnMut(u64)) -> Fetch {
    fetch_with(&curl(), attempt, std::process::id(), cancel, grew)
}
fn fetch_command(program: &Path, attempt: &Attempt, parent: u32) -> std::process::Command {
    let mut command = curl_command(program, attempt.dir, parent);
    command
        .args(["--speed-limit", "4096", "--speed-time", "60", "--max-filesize"])
        .arg(attempt.bytes.to_string())
        .args(["--continue-at", "-", "--output", attempt.name])
        .arg(DOWNLOAD_URL);
    #[cfg(unix)]
    if let Ok(lock) = attempt.lock.try_clone() {
        command.stdout(lock);
    }
    // Windows ends curl through its job instead.
    #[cfg(not(unix))]
    let _ = attempt.lock;
    command
}
fn fetch_with(
    program: &Path,
    attempt: &Attempt,
    parent: u32,
    cancel: &AtomicBool,
    grew: &mut dyn FnMut(u64),
) -> Fetch {
    let command = fetch_command(program, attempt, parent);
    let output = attempt.dir.join(attempt.name);
    let outcome = match run_curl(command, cancel, Some(&output), grew) {
        Ok((code, detail, _)) => curl_outcome(code, &detail),
        Err(stopped) => return stopped,
    };
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
/// unfinished file so the next attempt or press continues it. No curl or
/// HTTP numbers reach the pianist.
pub fn curl_outcome(code: Option<i32>, detail: &str) -> Fetch {
    let http = detail
        .rsplit("error: ")
        .next()
        .and_then(|x| x.trim().get(..3))
        .and_then(|x| x.parse::<u16>().ok());
    match code {
        Some(0) => Fetch::Ended,
        Some(6 | 7) => Fetch::Interrupted(format!(
            "Can't reach the piano download. Check the internet connection. {AGAIN}"
        )),
        Some(16 | 18 | 28 | 35 | 52 | 55 | 56 | 92) | None => {
            Fetch::Interrupted(format!("The piano download was interrupted. {AGAIN}"))
        }
        Some(33 | 36) => Fetch::Restart,
        Some(22) if http == Some(416) => Fetch::Restart,
        Some(22) if matches!(http, Some(404 | 410)) => Fetch::Failed(format!(
            "The piano file is no longer at its download address. {INSTALL_FROM_FILE}"
        )),
        Some(22) => {
            Fetch::Failed("The piano download isn't available right now. Try again later.".into())
        }
        Some(63) => Fetch::Failed(changed("downloaded")),
        Some(23) => Fetch::Failed(
            "The piano download could not be saved. Free about 4 GB and try again.".into(),
        ),
        Some(51 | 58 | 60 | 77 | 83 | 90 | 91) => Fetch::Failed(
            "The download server's identity could not be checked, so the piano was not downloaded.".into(),
        ),
        Some(_) => Fetch::Interrupted(format!("The piano download stopped. {AGAIN}")),
    }
}
/// One press: download the author's archive into the viewer's own piano
/// folder, continuing a download an earlier press left unfinished, then
/// check it where it lies and admit it exactly as a chosen ZIP would be.
/// `probe` reports the server's size and validator before anything is
/// fetched; `fetch` appends to the file from its current length. Cancel
/// discards the unfinished download; an interruption, or `keep` (the viewer
/// is quitting), keeps it for the next press.
pub fn download(
    root: &Path,
    cancel: &AtomicBool,
    keep: &AtomicBool,
    mut progress: impl FnMut(&str, u8),
    probe: impl FnMut() -> Result<Remote, Fetch>,
    fetch: impl FnMut(&Attempt, &mut dyn FnMut(u64)) -> Fetch,
) -> Result<PathBuf, String> {
    download_impl(
        root,
        &CURRENT_RELEASE,
        cancel,
        keep,
        &mut progress,
        probe,
        fetch,
        None,
    )
}
fn length(path: &Path) -> Result<u64, String> {
    match fs::symlink_metadata(path) {
        Ok(m) if m.is_file() => Ok(m.len()),
        Ok(_) => Err("Piano download path is not an ordinary file.".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(0),
        Err(e) => Err(err(e)),
    }
}
#[allow(clippy::too_many_arguments)]
fn download_impl(
    root: &Path,
    p: &Profile,
    cancel: &AtomicBool,
    keep: &AtomicBool,
    progress: &mut impl FnMut(&str, u8),
    mut probe: impl FnMut() -> Result<Remote, Fetch>,
    mut fetch: impl FnMut(&Attempt, &mut dyn FnMut(u64)) -> Fetch,
    test_free: Option<u64>,
) -> Result<PathBuf, String> {
    cancelled(cancel)?;
    let root = prepare_root(root)?;
    let lock = exclusive(&root)?;
    sweep(&root, p);
    let name = format!("{}download.part", p.prefix);
    let part = root.join(&name);
    let record = root.join(format!("{}download.json", p.prefix));
    let discard = || {
        let _ = fs::remove_file(&part);
        let _ = fs::remove_file(&record);
    };
    // Cancel discards the unfinished download; quitting keeps it.
    let stop = |message: String| {
        if !keep.load(Ordering::Acquire) {
            discard();
        }
        message
    };
    let percent = |have: u64| (have.min(p.bytes).saturating_mul(100) / p.bytes) as u8;
    unattended(&part)?;
    if length(&part)? > p.bytes {
        discard();
    }
    if length(&part)? < p.bytes {
        progress("downloading", percent(length(&part)?));
        let remote = match probe() {
            Ok(remote) => remote,
            Err(Fetch::Failed(why) | Fetch::Interrupted(why)) => {
                cancelled(cancel).map_err(stop)?;
                return Err(why);
            }
            Err(_) => Remote::default(),
        };
        cancelled(cancel).map_err(stop)?;
        if remote.bytes.is_some_and(|n| n != p.bytes) {
            discard();
            return Err(changed("downloaded"));
        }
        // A file uploaded again since the unfinished part began is not spliced onto it.
        let known = fs::read(&record)
            .ok()
            .filter(|x| x.len() < 300)
            .map(|x| String::from_utf8_lossy(&x).into_owned());
        if known.is_some() && remote.validator.is_some() && known != remote.validator {
            discard();
        }
        let remember = |validator: &Option<String>| {
            if let Some(v) = validator {
                let _ = fs::write(&record, v);
            }
        };
        if known.is_none() || length(&part)? == 0 {
            remember(&remote.validator);
        }
        enough_space(
            test_free.unwrap_or(fs2::available_space(&root).map_err(err)?),
            (p.bytes - length(&part)?)
                .checked_add(p.raw)
                .ok_or("Piano size overflow")?,
        )?;
        let mut reason = String::new();
        let mut attempts = 0;
        let mut restarted = false;
        while attempts < DOWNLOAD_ATTEMPTS {
            let have = length(&part)?;
            if have >= p.bytes {
                break;
            }
            attempts += 1;
            progress("downloading", percent(have));
            let attempt = Attempt {
                dir: &root,
                name: &name,
                have,
                bytes: p.bytes,
                lock: &lock,
            };
            let outcome = fetch(&attempt, &mut |now| progress("downloading", percent(now)));
            cancelled(cancel).map_err(stop)?;
            match outcome {
                Fetch::Ended => reason.clear(),
                Fetch::Interrupted(why) => reason = why,
                Fetch::Failed(why) => return Err(why),
                Fetch::Restart if !restarted => {
                    restarted = true;
                    attempts -= 1;
                    discard();
                    remember(&remote.validator);
                    continue;
                }
                Fetch::Restart => {
                    discard();
                    return Err(
                        "The piano download could not continue. Press Download piano to start it again.".into(),
                    );
                }
            }
            if length(&part)? > p.bytes {
                discard();
                return Err(changed("downloaded"));
            }
        }
        if length(&part)? != p.bytes {
            return Err(if reason.is_empty() {
                format!("The piano download stopped early. {AGAIN}")
            } else {
                reason
            });
        }
    }
    // Checked where it lies: a quit while checking or installing costs no
    // download and leaves no second copy.
    ordinary(&part, false)?;
    let mut input = File::open(&part).map_err(err)?;
    let mut hash = Sha256::new();
    let mut bytes = 0u64;
    let mut buffer = vec![0; BUFFER];
    loop {
        cancelled(cancel).map_err(stop)?;
        let n = input.read(&mut buffer).map_err(err)?;
        if n == 0 {
            break;
        }
        bytes = bytes.checked_add(n as u64).ok_or("Piano size overflow")?;
        if bytes > p.bytes {
            break;
        }
        hash.update(&buffer[..n]);
        progress("checking", percent(bytes));
    }
    drop(input);
    if bytes != p.bytes || hex(hash.finalize()) != p.archive_sha256 {
        discard();
        return Err(changed("installed"));
    }
    let id = nonce();
    let stage = root.join(format!("pending-{id}"));
    fs::create_dir(&stage).map_err(err)?;
    let _guard = OwnedDirectory(Some(stage.clone()));
    match admit(&root, &stage, &part, &id, p, cancel, progress, test_free) {
        Ok(sfz) => {
            discard();
            Ok(sfz)
        }
        Err(e) if cancel.load(Ordering::Acquire) => Err(stop(e)),
        // A full disk keeps the checked download for the next press.
        Err(e) => Err(e),
    }
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
