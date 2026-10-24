# Native delivery from the viewer

Native builds now run in this public repository using `.github/workflows/build-score-viewer-native.yml`. The dispatch-only workflow checks out one exact reviewed viewer delivery commit without submodules, installs its locked public and vendored npm dependencies with lifecycle scripts disabled, and builds the root `src-tauri/` on Windows and Mac. It needs no private ISO checkout or repository-access secret.

`delivery-input/` seals the previously reviewed application build: `inputs.json` inventories the original native source, locked dependencies, frontend and checks; `checks.json` binds source tests/build/browser inspection/independent review; `frontend/` holds the exact emitted payload. Native preparation verifies these before adding a delivery identity and generating embedded-payload probes. The application revision in `sourceInputs.viewerRevision` remains distinct from the newer delivery/workflow commit in `sourceRevision`. The notation revision remains provenance for the frozen application and is never fetched by these workers.

The native worker and verification closure lives in `scripts/native-delivery/`. It carries the existing Windows tests/static runtime admission, universal Mac tests/MIDI/audio/signature/resource/deployment/DMG/native launch gates, actual footer WebKit check, both-architecture embedded payload proof, source/notices and independent pair verification. Root-native sources are not copied into a second application tree. The temporary historical ISO carrier generator below remains for reproducing old receipts, not for current builds.

For this transition, `node scripts/native-delivery/adapt-sealed-inputs.mjs <viewer-root>` explicitly rebases the old sealed helper paths to their viewer-owned locations, records the original input hash, and verifies all retained native, frontend and check pins. It rolls back the manifest on failure. Review and commit the adapted manifest before dispatch.

```sh
node scripts/native-delivery/release-score-viewer.mjs \
  --repository hypermemetic-ai/score-viewer \
  --ref main --revision <reviewed-delivery-SHA> \
  --output <existing-paired-download-directory>
```

Publication still requires the complete verified Windows/Mac pair and preserves immutable releases and the atomic current pointer. Migrating an existing ISO-carrier publication additionally requires `--migrate-from-iso-carrier <exact-current-carrier-SHA>`. This verifies the old pair behind the current pointer and its exact download hashes, then requires the new application revision to descend from its recorded viewer revision. It does not compare unrelated Git histories or silently bypass ordering. Subsequent viewer deliveries use ordinary delivery-commit ancestry again. Installation and preservation of the user's current display/session/data remain a separate activation step.

## Freezing a new application revision

After committing and reviewing an application change, build that exact clean source and prepare a new source-check receipt with its viewer revision, notation revision, frontend digest and the actual test/build/browser/review evidence. A receipt may explain a retained baseline plus targeted regressions; do not relabel old evidence as newly executed checks.

```sh
node scripts/native-delivery/freeze-inputs.mjs \
  <clean-app-checkout> <reviewed-app-SHA> \
  <new-built-frontend> <new-source-checks.json> <new-sealed-output>
```

### Neutral naming in the receipt

The receipt is copied byte for byte into the public seal and its SHA256 is pinned, so it can't be cleaned up later without a new seal. Name scores by their public studio ids (for example `schumann-op68-no14`, or a path under `fixtures/`) or as the literal "a private score". Name the owner's data as "a private data copy", never by path. Leave out home and user-profile paths (`/home/...`, `/Users/...`, `C:\Users\...`, `%USERPROFILE%`, `$HOME`, `~/.local`, `~/.config`) and absolute paths to `.tuna` archives outside `fixtures/`.

`freeze-inputs.mjs` refuses a receipt that breaks these rules before it writes anything (`scripts/native-delivery/receipt-privacy.mjs`). Private titles, composers and library ids are refused through `scripts/native-delivery/private-score-names.json`. That file holds only salted digests of the normalized names, so the list itself prints none of them. The refusal names the kind of problem and its JSON location, never the name. To refuse further names on one machine without committing them, set `SCORE_VIEWER_PRIVATE_SCORE_NAMES` to a local file with one name per line. To add a name to the committed list, add its `nameDigest(name)`. The receipt sealed before this rule still names private scores. It stays as sealed and is replaced at the next seal.

The output directory must be new and separate from the source and frontend. The command reads the application commit directly, derives its native files and locked tarballs, validates the frozen converter closure, and binds the exact footer policy, metrics, fixture and viewer-owned helper bytes. It verifies the complete staged seal against the original checkout and leaves that checkout unchanged. Replace `delivery-input/` with the resulting directory in a later reviewed delivery commit. That delivery commit identifies the workflow checkout; the seal continues to identify the application commit it actually builds.

## Historical ISO carrier procedure


The application remains owned by this repository. The existing authenticated paired Windows/Mac workers live in ISO. Their unchanged workflow expects `score-viewer/package.json`, `score-viewer/src-tauri/` and ISO release scripts; it cannot build this repository merely by dispatching a viewer revision.

`scripts/create-native-release-carrier.mjs` prepares an isolated ISO **delivery carrier** at the viewer's exact notation pin. It copies only the final viewer's native shell, package/lock and license files, plus a frozen frontend that has already passed source and browser review. It does not copy or rebuild the viewer TypeScript in ISO, change authentication/workflows, modify the source checkout or activate an installation. A generated carrier is independently reviewed through a temporary ISO PR before dispatch, rather than merged over the legacy application main tree.

The copied package and lockfile also require their local `file:vendor/...tgz` dependencies for the workflow's unchanged `npm ci --prefix score-viewer`. The generator derives that closure from both declarations and lock entries, copies only tracked regular tarballs at their exact relative paths, and binds them in the native inventory with SHA512 lock integrity and byte-preserving Git attributes. Preparation and workers repeat these checks. The converter tarball must additionally match the frozen `converter/gp/source-package.tgz` and its authored source identity; missing, changed or unsupported local dependencies refuse preparation before compilation.

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

The engine's `src-tauri/vendor/sfizz/provenance.json` must match its full vendored source inventory. The separate `src-tauri/piano-notices/manifest.json` identifies the engine and only the curated linked-component notices, with exact file sizes and SHA256 hashes. Every license must match its authored vendor original, including a byte-exact provenance copy. The sole application-authored exception is `BUILD-MODIFICATIONS.md`: its `sourcePath` must be exactly `piano-build/WINDOWS-UTF8-COMPATIBILITY.md`, and its bytes must match that independently pinned native build disclosure. No other application-source mapping or upstream-license override is admitted. The generator validates both manifests before carrier mutation; workers and pair assembly independently reject missing or changed notices. Both recipient ZIPs carry the manifest and named files under `notices/piano/`, with their identity recorded in `native-dependencies.json`. The Mac source configuration must additionally bundle those same files inside the app at `Contents/Resources/notices/piano/`; the worker verifies them before signature and DMG checks. Unlinked source scaffolding in the provenance record does not add its licenses to the curated runtime notice list.

Engine-enabled receipts require `pianoSources` and `pianoNotices` checks as well as the existing native tests. Windows additionally requires `pianoWindowsRuntime`: normal and delay-load PE imports are read directly, rejected if they introduce VC runtime DLL prerequisites, and rebound to the actual delivered executable during independent pair validation. These flags establish source and packaging verification; they do not establish a clean-machine launch or audio acceptance. Actual audio-stream observations and physical MIDI/audio/pedal acceptance are recorded separately. The sample bank is not copied into the carrier or native packages; an already acquired original ZIP uses the same reviewed native installer and managed-cache admission as a new download. Installation does not enable piano or connect MIDI automatically.

For an engine-enabled Mac build, the unchanged runner also invokes the one explicitly ignored CoreAudio diagnostic after the ordinary native tests. It generates its own tiny SFZ/WAV, opens an available output through the actual sampler and host, and checks low/high buffer tiers, initialization failure, close, reconfiguration and host-drop restoration. Cargo invocation is bounded to 180 seconds and must execute exactly one test. The worker retains its final JSON, test logs, fixture and submitted float PCM under `native-validation/piano-coreaudio/`. Worker and independent recipient validation bind these bytes, initialized stream identities/rates, restored buffers, finite nonzero samples and the silent panic tail. They separately recompute nonzero piano samples over the report's captured frame/sample interval before any cue is published, so metronome-only PCM cannot satisfy the sampler check. A report that CoreAudio has no active render outputs is explicitly `unavailable`; unexpected sampler, stream, restoration or missing-report failures fail delivery. This runner diagnostic exercises host close/drop; normal application exit wiring is covered separately by source/lifecycle checks. It does not establish physical Mac MIDI, audible quality or human latency acceptance.

Run the existing release command **from the generated carrier checkout** so it imports the adapted source-identity validator. The unchanged validator in an ordinary ISO checkout deliberately rejects the new embedded identity. Use the retained reviewed **new carrier branch** as `--ref` and its exact commit as the checkout input; the workflow definition itself remains unchanged:

```sh
node scripts/release-score-viewer.mjs \
  --repository hypermemetic-ai/iso-notation --ref RETAINED_NEW_CARRIER_BRANCH \
  --revision REVIEWED_CARRIER_SHA \
  --score-path public/review/schumann-no14-conventional-20261006.tuna \
  --score-sha256 2ffc820dc1f57ba45249331c68671d82e71ea7edd0edc284fcbc03d90fd5584d \
  --output /home/qqp/projects/iso-notation-deploy/public/review/score-viewer
```

The command obtains both native packages, independently verifies the complete pair, and changes the current download pointer atomically. Recheck that the selected carrier is a descendant of the then-current paired revision; an unrelated or older finishing pair is rejected and the current download stays intact. An existing complete artifact can be reused only after identical source/score and package verification. Retain actual preparation/native/assembly timings and cache context in the delivery receipt.

A later Windows activation is a separate operation: reverify the target machine and console identity, preserve the running package/data, install additively, verify package identity, point the `current` junction the taskbar pin targets at it and inspect the native viewer on the display where it is used.

If the viewer is used on a second display, launch it from a taskbar pin on that display: Windows opens a window launched from a taskbar on that taskbar's screen, while desktop icons always sit on the primary screen. The pin targets `%USERPROFILE%\ISO Score Viewer\current\iso-score-viewer.exe`, where `current` is a junction to the installed package, so an install never has to touch the pin. After the old viewer has stopped and the new package is installed, run `scripts/native-delivery/windows-viewer-links.ps1 -Destination <package> -Keep <backup folder>`. It points `current` at the package, rewrites in place any pin that still targets a package folder so it targets `current`, sets any desktop shortcut to the viewer aside into the backup, keeps every original link there, and never creates a pin or shortcut. It checks every link and backup name before changing any; a second run changes nothing, and running it with the previous package rolls back. Never swap a pin's `.lnk` through a temporary file or `File.Replace`: Explorer tracks the pin file by identity, follows it to the temporary name and is left with a pin that launches nothing and cannot be unpinned. If it reports no pin, start `current\iso-score-viewer.exe`, pin it from the taskbar of the display where the viewer is used, close it and run the script again (Windows records the package folder in a new pin; the script rewrites it to `current`); do not add a shortcut. Then launch from that pin and confirm the window, and a file dialog such as Import, open on that display as one pinned taskbar button. Do not change which screen is primary: that moves other applications' windows. Keep the emergency rollback package and backup. Native/package/startup evidence does not establish physical MIDI/audio/pedal or pianist acceptance.

For a new calculated-hand footer policy, the frozen frontend also emits the exact unmodified Liberation Serif Italic face, complete accessible notice and isolated public `footer-ink-probe.html`/fixture/ordinary-Worker closure. One additive root notice mirror and prepared Tauri resource override retain every original native/config byte, all four older font notices and 23 piano notices. Worker and extracted-pair checks independently require the source-pinned new notice in packet `notices/` and actual Mac app resources; existing app/DMG parity remains mandatory. The original configured Mac resources are deep-merged, rather than replaced.

The new Mac adapter runs a bounded MainActor AppKit/WKWebView helper before native compilation. NonPersistent storage and a closed, exact-hash loopback server execute production policy loading/drawing, real both-keyboard Worker exchange and independent receiving cold admission without booting the app or managed data. Mounted glyph bounds, returned-page footers, unchanged historical fallback and unavailable/ambiguous-font refusal are recorded. The validator independently derives all expected covers from the reviewed metric literal, binds source/frontend/helper/fixture identities, and rejects inflated covers or missing cases. Actual helper architecture and WebKit framework version are recorded separately from Node architecture. Compiler/helper groups and server sockets are owned and bounded.

Chromium observations are source evidence, not a passing native receipt. Actual Mac compile/paint and Windows WebView2 readiness/drawing are still required before installed acceptance. The isolated WK gate uses temporary loopback HTTP and records its Tauri custom-origin/CSP, minimum-OS, unexecuted-architecture and physical-acceptance limits. It supplements every existing native/startup/signature/audio/MIDI/notice/DMG check.
