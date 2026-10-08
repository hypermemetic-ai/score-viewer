#[path = "piano-build/build.rs"]
mod piano_build;
fn main() {
    piano_build::build();
    tauri_build::build();
}
