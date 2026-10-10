# Design

## Context

See proposal.md for the purpose. Current main 639179e has a one-shot `GroundworkSession`, a strict `PracticeSession`/`PracticeClock` repeat pipeline, and complete-frame source rendering. `PracticeView.selectPassage` skips groundwork after prior attainment and `completeGroundwork` writes its completion. The old preparation branch disables the complete frame, and `.practice-status` still occupies a flex row even for generic text. Shared Controls currently have six reader actions; V is a guarded fallback. Main also contains instrument-neutral manual practice that has no authority to invent piano hands or positions.

## Goals / Non-Goals

**Goals:** Separate selected practice mode from transport phase; preserve proven musical grading/count-in/repeat, ownership, saved evidence and complete-frame fitting. Make keyboard, button and pedal actions agree. A selected mode is a view/session choice, not an attained-speed record.

**Non-Goals:** Change the notation dependency, musical source, package/cold admission, native audio policy, converter/TAB renderer, public catalog, calibration or native identity. Do not fabricate Reading assessment for neutral manual Guitar/Bass. Do not rewrite prior receipts or autoarchive other completed changes.

## Decisions

1. **Reuse the untimed evaluator with explicit mode ownership.** Keep source-order single-position and adjacent-position steps, expose actual join/step boundaries, and cycle instead of writing groundwork or transitioning to Timed. Separate Reading progress from Timed session evidence. Correct chord matching, failures and quiet stray handling continue to use genuine attacks. Any zero-attack join must have a bounded skip/cycle rule, never an infinite loop. Timed retains the strict existing scheduler. Mode changes cancel through the same generation ownership used for asynchronous startup and prepared repeats. Internal pause preserves the selected primary mode; explicit Free view selects the inspection surface and Space returns to the previous primary mode. Holding/releasing preparation pitches no longer auto-starts Timed; actual carry-note obligations remain required.

2. **Keep complete source frames for every mode.** Ordinary leaves use the same complete-source certificate for an unchanged window; live Reading only changes owned visibility. Joined Reading displays actual two-measure boundary pairs from the existing certificate, rather than scaling the entire joined work. Changed pair windows can have their own truthful fit, but stage and footer geometry do not change. The 1/n counter is absolute top-right inside the reading area and has accessible join/range context. Generic status text is suppressed. Meaningful save/render/audio/error/carry messages use an accessible non-layout presentation and cannot cover required notation or displace the frame. No extra instruction row is reserved.

3. **Extend the single binding authority additively.** Add scoped mode actions to the shared controls/resolver/panel while retaining the six historical legacy dictionaries. Default U/T/V slots only fill genuinely unclaimed identities; existing primary/secondary bindings and explicit empty mode slots win. Runtime, Test, capture, conflict validation and button labels use the same effective slots. Avoid a new private practice parser. R rotation, O Options, field drafts, modal/capture and held/repeated input retain ownership.

4. **Preserve capabilities and saved data.** Disconnected piano Reading displays complete untimed source and allows truthful join-window browsing, with no automatic assessment/achievement/Done. Connected Reading evaluates admitted piano attacks. Instrument-neutral manual transport remains unchanged; shared CSS changes are verified there. Fresh piano defaults become 30/50/2%, preserving every present admitted custom preference. Recursively check original leaves at target before creating new joins; old persisted joined trees stay readable rather than deleting their evidence. Reading completion never updates best/manual/groundwork/history.

## Risks / Trade-offs

- Stale startup or repeat callbacks after switching mode → explicit generation cancellation and adversarial transition controls using the production session/clock boundary.
- Note hiding can shrink a fit → use complete source reservations and compare per-seat geometry across real mode/connection/error switches in both keyboard presentations.
- Added actions can steal saved keys or rewrite legacy dictionaries → intrinsic compatible admission, occupied-default/empty/modifier/pedal/capture tests and actual production keyboard navigation.
- Removing status can hide a necessary failure or carry setup → keep a meaningful accessible presentation outside the layout flow, test its visibility/enclosure and exact obligations.
- A saved 10% start is still 10% → preserve the user's present preference;30% is the fresh Timed default, not an indiscriminate migration.

## Migration Plan

Land one scoped reviewed Viewer PR with OpenSpec and source/browser evidence on current main; retain exact ISO pin. Re-run configured tests/build and existing count-in/frame controls, then independently inspect the actual rendered keyboard flows and unchanged saved originals. Root alone selects any later exact native source/carrier, obtains and verifies a full paired Windows/Mac build, preserves current files and prior app, and activates only after recipient checks. Current delivered 37aecb build remains available for rollback. Track source, built, installed and physical acceptance separately. No change is complete merely because source tests pass.
