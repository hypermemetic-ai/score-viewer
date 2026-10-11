# Design

## Context

See proposal.md for motivation and the exploratory-calibration delta for observable behavior. Existing `mountCalibration` collects legacy normalized thumb–pinky reports in `calibration.json`, whose personal selection can affect existing planner inputs. The global modal keyboard branch returns before any rating handler; MIDI currently reaches score-clock gating and practice held-input observation first. Managed-file names are admitted independently in TypeScript and Rust. Native release carriers already preserve locked local package tarballs.

## Goals / Non-Goals

**Goals:** make the calculator's prescribed exploratory session usable in the existing Calibrate hands entry, retaining source provenance, durability and input isolation. Keep a single runtime router per controller and freeze accepted state until writes complete.

**Non-Goals:** unrestricted trial enumeration, endpoints/four-station sampling, fitted hand models, anatomical pruning, playing capture, new calculation objectives or rewriting historical evidence.

## Decisions

1. **Reviewed root dependency.** Package exact merged calculator revision `e325912d00efaef887738f4fb0f94a2495d58577` into a tracked local tarball with Git revision/tree, archive digest and installed-member provenance. Import only `@hypermemetic-ai/fingering-calculator`. This follows the existing private-package/carrier closure without adding Git authentication or workflow configuration. Verify package bytes against the clean reviewed checkout before pinning. Keep the transitional notation/calculator worker dependency unchanged.
2. **Canonical one-location plan.** Use `createExploratoryCalibrationPlan`, not historical pages. The existing instrument preference selects piano versus Jankó; setup chooses one hand, an actual central MIDI anchor and optionally a second conventional reference. Display 208/52/104 before start. Use declared editable nominal physical profiles (MIDI 21–108, center C4 reference) with provenance, not claimed instrument measurements. Record player/setup identity and declared seating reference; no endpoints or fabricated comfort/pose reports.
3. **Dedicated session storage/controller.** Add exact `calibration-pilot-v1.json` to both managed-file allowlists. A versioned viewer envelope retains player identity, selected session and historical sessions. Admit every session through the supported pilot validator; invalid/older bytes are read-only and exportable. A controller uses core create/current/prepare/record/navigate/retract/progress/resume operations. Each mutation sets a write gate synchronously, persists its candidate snapshot, then publishes it. Failure leaves accepted state untouched. Session replacement and closure cannot accept stale asynchronous callbacks.
4. **Transient input gate plus one core router.** The shared router remains unchanged and fails to remember ignored test notes. Supplement it with runtime down identities for all admitted MIDI messages, retained through target and null-trial setup/write gates. Suppress duplicate positive note-ons; forward every release, including velocity zero. Store no event timing or test-note ledger. Preserve raw Digit/Numpad identities and repeat protection through pending writes. Reset trackers together on disconnect/focus/session replacement. This protects the pinned root API without redefining eligible controls or blocking manual grades while an anchor is held.
5. **Main owns device/modal integration.** Dispatch active calibration before score `PitchInputEpoch` and practice observers; retain current source/generation/focus checks and convert native channels 1–16 to core 0–15. Use a calibration-owned monotonic activation floor, not the score activation clock. While clock readiness is unavailable, keyboard remains usable and stale MIDI is refused. On blur/hidden/native focus loss, require fresh setup before returning. The existing app listeners survive trial advances. Dispose the controller/view on dialog close; durable writes already accepted in order may finish safely without reviving disposed UI.
6. **Focused physical renderer.** Use `calibrationKeyboardScene` and SVG usable patches, nominal body shapes, surrounding pitch labels and near-to-far row labels. Draw horizontal center guidance across selectable depth, not a strike-point dot. Overlay distinct anchor/active indicators and exact finger/level text. Show a small code-native visual of finger bending versus hand swivelling. Use core protocol/grade metadata directly. Keep the wrist/direction cue adjacent to ratings, show block setup controls and honest finite completion, and preserve shared undecorated `<kbd>` styling.
7. **Historical records remain separate.** Keep old span selection and records behind an explicitly labeled legacy view/export rather than admitting them as pilot evidence. New pilot grades never enter `calibrationForWorker` or personal progress. Session history is retained when starting another hand/instrument/run.

## Risks / Trade-offs

- Nominal geometry is not measured hardware → label it and freeze each declared profile with the session; later geometry changes create a new setup/session.
- Held-note reclassification in shared router → transient edge regression tests across navigation, setup and write gates, with releases always delivered.
- Slow/failed disk writes → candidate-before-publish serialization, release handling during writes and recoverable visible errors.
- Core validation copies finite plans and histories → use bounded session inputs and one current render pass; no exhaustive products or playing buffers.
- Keyboard focus and rotated modal navigation → grade routing has priority outside editable fields, key-up always clears state, browser inspection in both instrument layouts.
- Browser/software tests do not establish physical MIDI, human posture compliance or grade usefulness → report separate source, visual, native and human acceptance limits.

## Migration Plan

Add the root package pin and exact managed filename without rewriting any existing file. Deploy through the normal reviewed viewer PR and paired native carrier. Retain old native application identity and data. Rollback can use the prior application while retaining the new independent session file for later inspection; no automatic reverse migration is needed.
