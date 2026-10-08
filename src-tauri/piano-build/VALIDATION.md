# Engine source validation — 2026-10-08

This scoped lane introduces the engine source/build boundary and dependencies.
The installer and shared native audio owner register/use the module separately.
It does not activate an app or certify physical keyboard/speaker behavior.

The vendor closure contains 1,819 original regular source files totaling
21,743,072 bytes, with the engine and six dependency revisions recorded in
`vendor/sfizz/provenance.json`. Its SHA256 is
`13225ac7fc22d32c75403235516b61d795d7dde09065c9c5945826625950627e`.
Curated recipient notices contain 22 payload files (20 original license notices,
that provenance, and the authored build-modification disclosure) totaling
453,539 bytes, plus their manifest. The notice manifest SHA256 is
`5644a66f5a8f5a67f8b8c109978f37c808c5b2ad0d0391d4acb6aad8bf406ffd`.
The carrier reviewer independently validated their exact inventories and Mac
resource mappings. No bank, compiler, binary build product or empty placeholder
is included in source.

The filtered closure compiled to a Release Linux archive through the tracked
CMake aggregate. Four Rust tests linked to the real C API passed: built-in WAV
decoding with sample-offset note timing; MIDI/frame/order rejection; sustain,
repedal and worker ownership transfer/teardown; panic clearing of authored
pedal-noise voices and sustain. Test fixtures use spaced Unicode paths and
serialize construction/destruction like the production control worker. The
first release assertion used only 20 blocks and was too short for the engine's
50ms envelope transition; the final bounded release test includes that tail.
Unused WavPack fuzzing/regression data was removed after both source-build
closures passed; it has no target in the admitted CMake graph.

The actual Cargo helper compiled and built the full Windows-MSVC ABI aggregate
through clang-cl/xwin, including a toolchain path containing spaces and Unicode
and a non-Visual-Studio generator. Whole-target static CRT was selected by the
tracked root Cargo config: Cargo reported `crt-static`, C++ used `/MT`, and the
Rust test PE imported only Windows OS DLLs. The first `/MT` archive was 13,938,216 bytes,
SHA256 `a3911a5c746ac89de3a3eb7597d09a43bc33b3b8beecbaf88a70ab700fdeb67e`.
The generated PE linked successfully without MSVCP/VCRUNTIME/UCRT DLL imports.
Missing SDK PDB diagnostics affect cross-build debug symbols, not link success.
Earlier `/MD` binaries are superseded and are not recipient-package evidence.

Actual Windows execution then exposed a Unicode loading defect in the pinned
standard-filesystem backend: the first test could not open an SFZ under a
Unicode directory; three later tests failed through the poisoned lifecycle
mutex (34 host tests passed). Removing the fixture was not acceptable. The
version-1 source-owned `windows-utf8.cmake` transform instead selects the pinned
ghc UTF-8 filesystem backend in all three definition/forward/implementation
headers of the Windows private build copy. Original header SHA256 and exactly
one selector are checked; original vendor/provenance bytes remain unchanged.
The packaged `BUILD-MODIFICATIONS.md` discloses that transformation and lists
original/transformed hashes. Its source and exact recipient bytes are bound by
the curated manifest. Mac and Linux retain upstream backend selection.

The corrected `/MT` aggregate compiled successfully to 14,303,028 bytes,
SHA256 `3df7e12a4db73ade32084fde4bce8e348892ce26462a7b9e6289c7a272cc78eb`.
All three actual copied-header hashes matched the disclosure. Strengthened
fixtures require canonicalized Unicode root, SFZ filename, and sample filename;
all four passed on Linux with the unchanged Linux engine backend. The final
actual Windows probe passed all four engine tests plus 34 host tests (38/38),
using the installer's extended `\\?\` native path form. The original V6.2 bank
also loaded and rendered from a canonicalized native path, including its
authored relative sample references. Its bounded 9.5-second WASAPI stream
produced sampler-only nonzero PCM and a silent panic tail, with the production
256-frame internal sampler capacity. It does not replace broad memory/CPU
qualification or establish physical audio latency/quality.

The exact final wrapper SHA256 is
`0106fbd30a5e0588d689c42573285a4fd5ae6062dceb896a84b584634d7e4e4d`.
The static probe PE is 3,319,296 bytes, SHA256
`0d0829d19d8e594d4ade258ef4ee8a4d2f596cb1c17272c1ba06998df085a681`.
The native owner recorded the final scope, bank/path/configuration, complete
source inventory and test/stream hashes in
`score-viewer-piano-audio-20261008/canonical-final-native-qualification.json`,
SHA256 `2793c2abd0b8ff01ea68a661392de508594934aa3307f8f1f564fc563686935c`.
It reports unchanged applications/preferences/device defaults and no remaining
owned processes. The carrier reviewer independently validated all 23 final
notice resources and the exact authored disclosure source binding.

Cargo.lock adds only fs2 0.4.3 and zip 0.6.6; no existing dependency was upgraded.
sha2 0.10.9 and the portable-float Brotli 9.0.0 pin are preserved. Python import
and notice helpers operate only during development; builds perform no fetching.

The combined Tauri dependency graph, both native Mac
slices/minimum OS, output/MIDI/cue coexistence, recipient license/CRT-import
checks and operator musical acceptance remain separate final integration gates.
Source paths and private diagnostic logs are under the existing
`score-viewer-piano-benchmark-20261008` state directory. All engine-lane build/test
processes exited before its scoped source handoff.

The first combined Windows Tauri graph compiled its source and C++ engine but
failed to link: tauri-build 2.7.1's default partial `static_vcruntime` helper
disabled `libucrt` and requested dynamic `ucrt`, while Rust's whole-target
`crt-static` directives did the reverse. The standalone probe did not exercise
that Tauri helper. The source build script now uses the supported
`WindowsAttributes::static_vc_runtime(false)` only for Windows-MSVC targets
whose actual target features include `crt-static`. This disables only Tauri's
conflicting helper; Rust/C++ retain their matching static CRT and ordinary
Tauri resource/ACL generation still runs through `try_build`. Other targets
retain `tauri_build::build`. No dependency, workflow or vendor bytes changed.
The revised combined native link/import/runtime checks remain required.

Paired native run 37823532998 passed its Mac build/runtime checks but Windows
failed before testing with MSBuild FileTracker FTK1011. Four actual tracking-log
paths were 261, 262, 264, and 265 characters. The Windows source helper now uses
`OUT_DIR/p` instead of `OUT_DIR/piano-build`, and CMake uses child binary
directory `s` instead of `sfizz-build`. Other platform names are unchanged.
These supported build-tree aliases preserve verified source copying, target
isolation, CRT selection, two-job concurrency and normal dependency tracking;
they do not introduce a global temporary root or disable FileTracker.

At that CI root, the four observed paths become 241–245 characters. A path
model of the admitted 51-archive cross-build closure predicts its longest
tracking-log path at 253 characters (previously 273); the longest copied vendor
source path becomes 233 (previously 243). This model is not a Visual Studio
generated inventory or native qualification. One generated but unbuilt test
utility target would remain at 262 characters and is outside `piano_bundle`'s
admitted dependency closure. The native MSBuild retry remains the actual gate.
Build-tree selection is documented by CMake's
[command-line `-B` option](https://cmake.org/cmake/help/latest/manual/cmake.1.html)
and [the `add_subdirectory` binary directory](https://cmake.org/cmake/help/latest/command/add_subdirectory.html).
