# Proposal

## Why

The existing calibration screen collects only legacy thumb–pinky span reports. The reviewed calculator now supplies a bounded, setup-controlled exploratory protocol with meaningful finite progress; the viewer must make that protocol usable without changing existing calculations or personal evidence.

## What Changes

- Use the existing instrument selection and the calculator's exploratory root API: one selected hand and central location, 208 Jankó judgments in eight blocks or 52 judgments per explicitly selected conventional reference pitch (optionally two references, 104 total).
- Show physical anchor/target keys, fingers, rows and levels, horizontal-center guidance, a brief finger-adjustment versus whole-hand-swivel example, the protocol's persistent wrist/direction cue and five grade meanings.
- Require acknowledged setup at every block and after resume; accept keyboard and MIDI ratings concurrently, isolate calibration from practice observers and save successfully before publishing advancement.
- Add separate versioned session storage with progress, revisiting/correction, undo, resume and complete session JSON export. Preserve old or invalid bytes and retain legacy span data separately.
- Pin the reviewed merged calculator revision through a reproducible root package artifact and the existing native release dependency closure.

## Capabilities

### New Capabilities

- `exploratory-calibration`: bounded physical-contact collection, setup attestations, durable evidence and rating-only input.

### Modified Capabilities

None. Existing score editing, fingering calculations, practice assessment and delivery requirements remain applicable.

## Impact

Viewer calibration UI/controller, main modal/keyboard/MIDI lifecycle, browser/native managed-file allowlists, package dependency/lock and source identity, focused tests and validation documentation. Use fingering-calculator merged revision `e325912d00efaef887738f4fb0f94a2495d58577` (PR #27). Preserve application identity, source notation pin, user scores, corrections, library, settings and progress; use the ordinary reviewed PR/native activation path.
