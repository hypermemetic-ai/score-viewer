use sha2::{Digest, Sha256};
use std::{
    collections::BTreeSet,
    env, fs,
    path::{Component, Path, PathBuf},
    process::Command,
};

const ENGINE_PIN: &str = "f3ac7c0ae830104ae3bc8979dc2ed9fff939a926";
fn run(command: &mut Command) {
    let status = command
        .status()
        .expect("Could not launch pinned piano build tool");
    assert!(status.success(), "Pinned piano build failed: {command:?}");
}
fn verify_vendor(root: &Path) {
    let manifest: serde_json::Value = serde_json::from_slice(
        &fs::read(root.join("provenance.json")).expect("Missing engine provenance"),
    )
    .expect("Invalid engine provenance");
    assert_eq!(
        manifest["engine"]["revision"].as_str(),
        Some(ENGINE_PIN),
        "Engine revision drift"
    );
    let files = manifest["files"]
        .as_object()
        .expect("Missing engine source closure");
    let mut expected: BTreeSet<String> = files.keys().cloned().collect();
    expected.insert("provenance.json".into());
    fn inventory(root: &Path, directory: &Path, paths: &mut BTreeSet<String>) {
        for entry in fs::read_dir(directory).expect("Unreadable engine source directory") {
            let entry = entry.unwrap();
            let kind = entry.file_type().unwrap();
            assert!(!kind.is_symlink(), "Engine source links are forbidden");
            if kind.is_dir() {
                inventory(root, &entry.path(), paths);
            } else {
                assert!(kind.is_file(), "Engine source must be regular files");
                paths.insert(
                    entry
                        .path()
                        .strip_prefix(root)
                        .unwrap()
                        .to_str()
                        .unwrap()
                        .replace('\\', "/"),
                );
            }
        }
    }
    let mut actual = BTreeSet::new();
    inventory(root, root, &mut actual);
    assert!(
        actual == expected,
        "Engine source inventory drift: missing {:?}, extra {:?}",
        expected.difference(&actual).take(3).collect::<Vec<_>>(),
        actual.difference(&expected).take(3).collect::<Vec<_>>()
    );
    for (relative, proof) in files {
        assert!(
            Path::new(relative)
                .components()
                .all(|c| matches!(c, Component::Normal(_))),
            "Invalid vendor path"
        );
        let bytes = fs::read(root.join(relative)).expect("Missing pinned engine source");
        assert_eq!(
            bytes.len() as u64,
            proof["bytes"].as_u64().unwrap(),
            "Engine source size drift: {relative}"
        );
        assert_eq!(
            format!("{:x}", Sha256::digest(&bytes)),
            proof["sha256"].as_str().unwrap(),
            "Engine source drift: {relative}"
        );
    }
}
pub fn build() {
    let source = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    println!("cargo:rerun-if-changed=piano-build");
    println!("cargo:rerun-if-changed=vendor/sfizz");
    println!("cargo:rerun-if-changed=piano-notices");
    for key in [
        "CMAKE",
        "CC",
        "CXX",
        "CMAKE_GENERATOR",
        "CMAKE_TOOLCHAIN_FILE",
        "MACOSX_DEPLOYMENT_TARGET",
    ] {
        println!("cargo:rerun-if-env-changed={key}");
    }
    verify_vendor(&source.join("vendor/sfizz"));
    let target = env::var("TARGET").unwrap();
    // MSBuild FileTracker still has bounded .tlog paths. Keep its generated
    // paths short while retaining this Rust target's isolated output tree.
    let directory = if target.contains("-windows-") {
        "p"
    } else {
        "piano-build"
    };
    let destination = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join(directory);
    let cmake = env::var_os("CMAKE").unwrap_or_else(|| "cmake".into());
    let mut configure = Command::new(&cmake);
    configure
        .arg("-S")
        .arg(source.join("piano-build"))
        .arg("-B")
        .arg(&destination)
        .arg("-DCMAKE_BUILD_TYPE=Release");
    if target.ends_with("apple-darwin") {
        let arch = if target.starts_with("aarch64") {
            "arm64"
        } else {
            "x86_64"
        };
        configure
            .arg(format!("-DCMAKE_OSX_ARCHITECTURES={arch}"))
            .arg("-DCMAKE_OSX_DEPLOYMENT_TARGET=13.3");
    }
    if let Some(generator) = env::var_os("CMAKE_GENERATOR") {
        configure.arg("-G").arg(&generator);
    }
    if target.ends_with("windows-msvc") {
        // CMake's Windows default is Visual Studio. Ninja/toolchain users must
        // select the matching compiler environment themselves; -A is VS-only.
        if env::var("CMAKE_GENERATOR").map_or(true, |s| s.starts_with("Visual Studio")) {
            configure.arg("-A").arg(if target.starts_with("aarch64") {
                "ARM64"
            } else {
                "x64"
            });
        }
        let static_crt = env::var("CARGO_CFG_TARGET_FEATURE")
            .unwrap_or_default()
            .split(',')
            .any(|s| s == "crt-static");
        configure.arg(format!(
            "-DPIANO_MSVC_RUNTIME={}",
            if static_crt {
                "MultiThreaded"
            } else {
                "MultiThreadedDLL"
            }
        ));
    }
    if let Some(toolchain) = env::var_os("CMAKE_TOOLCHAIN_FILE") {
        let mut definition = std::ffi::OsString::from("-DCMAKE_TOOLCHAIN_FILE=");
        definition.push(toolchain);
        configure.arg(definition);
    }
    run(&mut configure);
    run(Command::new(&cmake)
        .arg("--build")
        .arg(&destination)
        .arg("--config")
        .arg("Release")
        .arg("--target")
        .arg("piano_bundle")
        .arg("--parallel")
        .arg("2"));
    println!(
        "cargo:rustc-link-search=native={}",
        destination.join("piano").display()
    );
    println!("cargo:rustc-link-lib=static=score_viewer_piano");
    if target.ends_with("apple-darwin") {
        println!("cargo:rustc-link-lib=c++");
    } else if target.contains("linux") || target.ends_with("windows-gnu") {
        println!("cargo:rustc-link-lib=stdc++");
    }
    if target.contains("linux") {
        println!("cargo:rustc-link-lib=atomic");
    }
}
