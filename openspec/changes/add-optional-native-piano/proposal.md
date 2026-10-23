## Why

The viewer can assess MIDI and play practice cues but cannot yet make the player's connected keyboard sound through the computer. The operator authorized integrating the measured native SFZ engine and an optional downloadable piano in the next paired native build. Samples are large and must remain a separately installed offline bank.

## What Changes

- Bundle the reviewed native SFZ engine and route MIDI to it before frontend delivery, through the existing shared native audio host.
- Add optional Piano controls in its own section below Audio/MIDI and above Keys and pedals in Options: initially off, volume, a compact four-choice Latency setting, concise status and a small delayed-sound helper.
- Add one-press Download piano that downloads, checks and installs the fixed current archive with progress and cancel, then switches the piano on; keep Install from a file… as a secondary offline path using a native ZIP picker. Both use a cancellable streaming worker. (The first delivery opened the author's page; the author has since replaced V6.2 with V6.2a, which that page links only through share sites.)
- Admit only the unchanged official Accurate-Salamander V6.2 or V6.2a 48 kHz/24-bit archive into an atomic private managed cache. Retain licenses and original bytes, validate member paths, CRCs, hashes and SFZ/sample closure, and preserve a prior bank on failures.
- Persist piano preferences through the existing preferences file while preserving all existing scores, progress, fingering and input settings.
- Verify the combined frontend/native source, license closure and paired native package before Windows activation and physical MIDI/audio acceptance.
- Reduce avoidable Windows live-key delay by making the selected latency tier control queued PCM instead of filling all allocated storage. Verify actual submission/loopback evidence while keeping physical acceptance separate.

## Capabilities

### New Capabilities
- `optional-native-piano`: optional managed bank installation, native piano sound and Options controls.

### Modified Capabilities
- None. Existing score preparation, practice assessment and native application identity remain authoritative.

## Impact

Viewer-owned frontend, native shell/audio/MIDI, native engine dependencies and their source/license carrier. The app bundles the engine and notices, not the 1.65 GB sample ZIP. The installer/cache contract is independent of the acquisition URL so a future reviewed Cloudflare download can use it. No account/domain provisioning or 44.1 kHz bank conversion is included. Native output matches its current admitted mix format; current measurements do not establish physical sound-to-ear latency.

Before native bank admission, show only Download piano, Install from a file…, Volume and necessary installation status/cancel. Hide piano enable/latency and delayed-sound help until admitted. Keep shared Audio/MIDI controls available; an admitted but disabled piano allocates no sampler or samples. Windows help gives internally relevant enhancement steps and manufacturer/compatible HD Audio routes with direct consequences and restoration guidance, without automatic driver changes or internal test stories.
