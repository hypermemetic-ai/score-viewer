#[path = "piano-build/build.rs"]
mod piano_build;
fn main() {
    piano_build::build();
    let rust_static_crt = std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc")
        && std::env::var("CARGO_CFG_TARGET_FEATURE")
            .unwrap_or_default()
            .split(',')
            .any(|feature| feature == "crt-static");
    if rust_static_crt {
        // Rust owns the complete static CRT, including libucrt. Tauri's
        // separate partial-CRT helper requests dynamic ucrt and disables
        // libucrt, which conflicts with Rust's +crt-static link directives.
        let attributes = tauri_build::Attributes::new()
            .windows_attributes(tauri_build::WindowsAttributes::new().static_vc_runtime(false));
        tauri_build::try_build(attributes).expect("Could not build Tauri resources and ACLs");
    } else {
        tauri_build::build();
    }
}
