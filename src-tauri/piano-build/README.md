# Native piano engine

The viewer statically embeds Dusk-Fizz/sfizz revision
`f3ac7c0ae830104ae3bc8979dc2ed9fff939a926`. The engine and six pinned source
dependencies are regular files under `vendor/sfizz`; no Git submodule,
build-time download, system decoder, VST host or sample bank is required.
`provenance.json` lists every admitted upstream file and dependency revision.
The build verifies exact inventory, sizes and SHA256 before compiling.

`import-source.py` recreates this filtered closure from an independently pinned
local checkout. It excludes tests, benchmarks, examples, documentation and
empty placeholders while retaining platform headers. `update-notices.py`
copies the linked components' original notices and source provenance to
`piano-notices`. Its manifest binds exact recipient bytes. Unlinked CLI and
XMMS notices remain in vendor source but are not listed as runtime licenses.
Git attributes preserve upstream line endings on Windows. The Mac resource
configuration maps all curated notices into `notices/piano` before signing.

Cargo calls the helper before the existing `tauri_build::build`. CMake builds
static Release code with the built-in permissive decoder, no sndfile, OpenMP,
plugins, clients, tests, Faust regeneration or host-specific CPU flags. Optional
WavPack assembly is disabled; the unchanged instrument uses PCM WAV. Every
build works on a private copy because upstream generates source-directory
headers. The final archive contains the built static dependency closure.
Windows also selects the pinned ghc UTF-8 filesystem backend consistently in
that copy; all three original header hashes and unique selectors are checked.
The original vendor closure is unchanged. `WINDOWS-UTF8-COMPATIBILITY.md`
records the versioned transform and is packaged as `BUILD-MODIFICATIONS.md`.

Each Rust target has its own `OUT_DIR`. Mac targets explicitly select `arm64`
or `x86_64` and deployment floor 13.3; the paired native build must validate both
slices. The viewer-root `.cargo/config.toml` selects Windows-MSVC-only static
CRT so Rust and every C/C++ archive use `/MT` together, without requiring a
separate VC-runtime installation. The helper derives the actual target feature
and uses `/MD` when static CRT is not selected for an external embedding build.
For Windows-MSVC with Rust `crt-static`, the application build script disables
Tauri's separate partial `static_vcruntime` helper through its supported
`WindowsAttributes` API. Rust then owns the complete static CRT, including
`libucrt`; Tauri still builds the ordinary resources and ACLs. Other targets
retain the default Tauri build path.
CMake, a matching C/C++ compiler and archive
tool are build prerequisites. Explicit non-Visual-Studio generators select
their compiler environment/toolchain rather than receiving a VS-only `-A`.
The optional toolchain path remains a single literal OS-string argument.
Windows uses `OUT_DIR/p` and the engine child binary directory `s` to shorten
MSBuild tracking-log paths. This retains per-target build isolation and normal
dependency tracking; other platforms retain `piano-build/sfizz-build` names.

`PianoEngine` owns one native pointer. It is movable (`Send`) and exclusively
accessed (`!Sync`). Construct, configure and load on a control worker; the host
stops the output callback before moving or destroying it. The callback supplies
stereo buffers and monotonically ordered MIDI offsets. The wrapper rejects
invalid MIDI values, decreasing offsets and render blocks that cannot contain
accepted events. Buffers above 8192 frames must be chunked by the host. Invalid
render calls output silence; pending events require a sufficiently large valid
block or off-callback teardown. No Rust allocation, lock or I/O occurs in the
valid event/render path. This does not claim that every engine failure path is
real-time safe.

The fixed qualified profile is 256 voices, 8192 source-frame attack preload,
live interpolation quality 2, sustain-cancels-release enabled, CC20/21/22 at 64
and CC23 at 127. No reverb is added. The host owns final volume, MIDI-channel
aggregation and actual output rate; 44.1 kHz is preferred when the device admits
it. Original sample headers are not rewritten. Panic releases CC64 before
clearing voices/effects so authored pedal noise cannot retrigger sound; the
mechanics/resonance controllers remain intact.

The bank stays optional and separately admitted by the native installer. This
engine streams into full decoded sample buffers and has no hard cache cap.
The qualified standalone Windows runs used about 651–659 MiB peak process
commit, not whole-viewer memory or cheap-hardware certification. Disabling
drops the engine/cache off callback; its shared loader pool uses weak global
ownership and is released with the final engine owner. Native packages,
actual output/MIDI integration and physical musical acceptance need their own
receipts.
