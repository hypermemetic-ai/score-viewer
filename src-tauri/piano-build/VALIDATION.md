# Engine source validation — 2026-10-08

This scoped lane introduces the engine source/build boundary and dependencies.
The installer and shared native audio owner register/use the module separately.
It does not activate an app or certify physical keyboard/speaker behavior.

The vendor closure contains 1,819 original regular source files totaling
21,743,072 bytes, with the engine and six dependency revisions recorded in
`vendor/sfizz/provenance.json`. Its SHA256 is
`13225ac7fc22d32c75403235516b61d795d7dde09065c9c5945826625950627e`.
Curated recipient notices contain 21 files (20 original license notices and
that provenance) totaling 451,567 bytes. The notice manifest SHA256 is
`b32e543c638e6a680d2c86f2d3be7f41bb12b66d381fd92014b05e14de619953`.
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
Rust test PE imported only Windows OS DLLs. The `/MT` archive is 13,938,216 bytes,
SHA256 `a3911a5c746ac89de3a3eb7597d09a43bc33b3b8beecbaf88a70ab700fdeb67e`.
The generated PE linked successfully without MSVCP/VCRUNTIME/UCRT DLL imports.
Missing SDK PDB diagnostics affect cross-build debug symbols, not link success.
Earlier `/MD` binaries are superseded and are not recipient-package evidence.

Cargo.lock adds only fs2 0.4.3 and zip 0.6.6; no existing dependency was upgraded.
sha2 0.10.9 and the portable-float Brotli 9.0.0 pin are preserved. Python import
and notice helpers operate only during development; builds perform no fetching.

Actual Windows execution, the combined Tauri dependency graph, both native Mac
slices/minimum OS, output/MIDI/cue coexistence, recipient license/CRT-import
checks and operator musical acceptance remain separate final integration gates.
Source paths and private diagnostic logs are under the existing
`score-viewer-piano-benchmark-20261008` state directory. All engine-lane build/test
processes exited before its scoped source handoff.
