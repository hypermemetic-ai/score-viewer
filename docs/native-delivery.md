# Native delivery from the extracted viewer

The application remains owned by this repository. The existing authenticated paired Windows/Mac workers live in ISO. Their unchanged workflow expects `score-viewer/package.json`, `score-viewer/src-tauri/` and ISO release scripts; it cannot build this repository merely by dispatching a viewer revision.

`scripts/create-native-release-carrier.mjs` prepares an isolated ISO **delivery carrier** at the viewer's exact notation pin. It copies only the final viewer's native shell, package/lock and license files, plus a frozen frontend that has already passed source and browser review. It does not copy or rebuild the viewer TypeScript in ISO, change authentication/workflows, modify the source checkout or activate an installation. A generated carrier is independently reviewed through a temporary ISO PR before dispatch, rather than merged over the legacy application main tree.

The carrier's own commit is the unchanged workflow's `source_revision` checkout input and the pair's `sourceRevision`. Every package and native executable additionally binds the exact `hypermemetic-ai/score-viewer` revision/tree, `hypermemetic-ai/iso-notation` pin, native inventory, original frontend inventory and source-check receipt. Do not describe the carrier commit as the application-source commit. `Source-provenance.json`, `Source-validation.json` and `Release-identity.json` travel in both recipient packets.

Use a clean final viewer checkout and a clean task-owned ISO worktree checked out at the declared notation pin:

```sh
node scripts/create-native-release-carrier.mjs \
  /absolute/clean-viewer FINAL_VIEWER_SHA \
  /absolute/frozen-dist /absolute/source-checks.json \
  /absolute/isolated-iso-carrier
```

The checks file must bind the same final source and frontend. Calculate `frontendDigest` as SHA256 of the canonical sorted `{path: {sha256, size}}` inventory (`inventory` and `canonical` from `scripts/native-release-carrier/inputs.mjs`). It must contain:

```json
{
  "schema": 1,
  "viewerRevision": "FULL_FINAL_VIEWER_SHA",
  "notationRevision": "FULL_PINNED_ISO_SHA",
  "frontendDigest": "SHA256_OF_SORTED_FROZEN_FRONTEND_INVENTORY",
  "checks": {
    "tests": {"status": "passed"},
    "build": {"status": "passed"},
    "browserInspection": {"status": "passed"},
    "independentReview": {"status": "passed"}
  }
}
```

Include actual counts, artifact receipts and review references in those check objects. This receipt records observed evidence; it does not create evidence from status labels. Never create it before the final reviewed source, configured build and browser checks have completed.

The generator rejects dirty/wrong source checkouts, stale checks/frontend, mismatched gitlink/provenance, symlinks (including the frontend directory itself) and unsupported script adaptation anchors before changing the carrier. Carrier-only Git attributes preserve exact copied native/package/license and frozen-input bytes across Windows newline conversion; existing attributes are retained. Preparation verifies frozen/native inputs, adds one source-bound embedded release asset and produces the existing exact Tauri/Brotli probes. Native workers revalidate native files and source identities before compiling. The original Windows native tests, universal Mac tests/virtual MIDI, signature/resource/13.3 deployment checks, exact DMG/app parity and available direct/normal OS launch checks remain enabled. Pair assembly independently proves all frozen assets inside Windows and both Mac slices. The existing atomic private publication operation remains the only current-download update.

When the optional piano engine is present, the same native inventory includes all regular tracked files under `src-tauri/vendor/sfizz/`, `src-tauri/piano-build/`, the source `build.rs`, and its Cargo dependencies. It also binds the exact root `.cargo/config.toml`, copied to the carrier's `score-viewer/.cargo/config.toml` where the workers invoke Cargo. That target-scoped configuration selects the Windows static CRT; the C++ build must match it. The carrier preserves `build.rs` exactly; preparing the frontend only disables its JavaScript build hook through an additional Tauri configuration. Engine compilation and `tauri_build::build()` still run normally. CMake must build from its verified copy under Cargo's target output directory, keeping generated engine headers and build files outside the source inventory.

The engine's `src-tauri/vendor/sfizz/provenance.json` must match its full vendored source inventory. The separate `src-tauri/piano-notices/manifest.json` identifies the engine and only the curated linked-component notices, with exact file sizes and SHA256 hashes. Every curated file must match its authored vendor original, including a byte-exact provenance copy. The generator validates both manifests before carrier mutation; workers and pair assembly independently reject missing or changed notices. Both recipient ZIPs carry the manifest and named files under `notices/piano/`, with their identity recorded in `native-dependencies.json`. The Mac source configuration must additionally bundle those same files inside the app at `Contents/Resources/notices/piano/`; the worker verifies them before signature and DMG checks. Unlinked source scaffolding in the provenance record does not add its licenses to the curated runtime notice list.

Engine-enabled receipts require `pianoSources` and `pianoNotices` checks as well as the existing native tests. Windows additionally requires `pianoWindowsRuntime`: normal and delay-load PE imports are read directly, rejected if they introduce VC runtime DLL prerequisites, and rebound to the actual delivered executable during independent pair validation. These flags establish source and packaging verification; they do not establish a clean-machine launch or audio acceptance. Actual audio-stream observations and physical MIDI/audio/pedal acceptance are recorded separately. The sample bank is not copied into the carrier or native packages; an already acquired original ZIP uses the same reviewed native installer and managed-cache admission as a new download. Installation does not enable piano or connect MIDI automatically.

For an engine-enabled Mac build, the unchanged runner also invokes the one explicitly ignored CoreAudio diagnostic after the ordinary native tests. It generates its own tiny SFZ/WAV, opens an available output through the actual sampler and host, and checks low/high buffer tiers, initialization failure, close, reconfiguration and host-drop restoration. Cargo invocation is bounded to 180 seconds and must execute exactly one test. The worker retains its final JSON, test logs, fixture and submitted float PCM under `native-validation/piano-coreaudio/`. Worker and independent recipient validation bind these bytes, initialized stream identities/rates, restored buffers, finite nonzero samples and the silent panic tail. A report that CoreAudio has no active render outputs is explicitly `unavailable`; unexpected sampler, stream, restoration or missing-report failures fail delivery. This runner diagnostic exercises host close/drop; normal application exit wiring is covered separately by source/lifecycle checks. It does not establish physical Mac MIDI, audible quality or human latency acceptance.

Run the existing release command **from the generated carrier checkout** so it imports the adapted source-identity validator. The unchanged validator in an ordinary ISO checkout deliberately rejects the new embedded identity. Keep the workflow definition on its existing `main` ref and supply the reviewed carrier commit as its checkout input:

```sh
node scripts/release-score-viewer.mjs \
  --repository hypermemetic-ai/iso-notation --ref main \
  --revision REVIEWED_CARRIER_SHA \
  --score-path public/review/schumann-no14-conventional-20261006.isoscore \
  --score-sha256 2ffc820dc1f57ba45249331c68671d82e71ea7edd0edc284fcbc03d90fd5584d \
  --output /home/qqp/projects/iso-notation-deploy/public/review/score-viewer
```

The command obtains both native packages, independently verifies the complete pair, and changes the current download pointer atomically. Recheck that the selected carrier is a descendant of the then-current paired revision; an unrelated or older finishing pair is rejected and the current download stays intact. An existing complete artifact can be reused only after identical source/score and package verification. Retain actual preparation/native/assembly timings and cache context in the delivery receipt.

A later Windows activation is a separate operation: reverify the laptop and console identity, preserve the running package/data/shortcut, install additively, verify package identity, switch the usual shortcut and inspect the native viewer. Keep the emergency rollback package and backup. Native/package/startup evidence does not establish physical MIDI/audio/pedal or pianist acceptance.
