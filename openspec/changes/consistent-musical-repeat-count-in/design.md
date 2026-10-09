# Musical repeat timing

## Context

See proposal.md. Existing browser and native repeats allow past count origins and skip elapsed clicks. Native and Viewer pulse-grid admission fix score offset to two reference beats; this fits Schumann 6/8 but not Zelda 3/4. Reference tempo units are clock units, not necessarily the meter beat.

## Goals / Non-Goals

Make every repeat audibly identifiable and musically phased, without normal-loop saving or stream setup shifting its boundary. Retain source/personal identity, queued speeds, first-loop Done and existing cancellation. Do not change device selection, driver or sampler policy.

## Decisions

Use v2 pulse metadata derived from source meter and exact source bars: reference pulses, exact metric beat starts, per-bar full meter/beat/phase vectors, complete entry-bar length, metric count-beat length, count-start phase and entry pickup phase. Recognize an opening short bar only with a following complete same-meter bar; retained written numbering zero or a literal repeat-entry plus that context can identify another pickup. Carry established written phases through performed occurrence mapping. Later short endings and partial meter-change bars stay downbeat-aligned when upbeat authority is absent; shortening alone proves no pickup. All phase metadata is Viewer-only and leaves source/archive bytes literal. Compound meters group three denominator units; simple/irregular meters use denominator beats without inventing asymmetric grouping.

Initial count starts at entry-meter phase zero and lasts one complete entry bar plus the lead to the genuine pickup phase. A repeat preserves the predecessor source exit phase when its final meter/metric beat is compatible with the entry meter; otherwise the boundary explicitly adopts entry-meter phase zero. Its offset is one full entry bar plus modulo(entry phase − count-start phase, entry bar). Thus a one-quarter pickup followed by a three-quarter complementary ending in 4/4 initially counts 1,2,3,4,1,2,3; subsequent complete cues count 4,1,2,3 and the pickup enters on 4. Scale both rational grids by their bounded least common pulse unit when needed. Session grading, display, prepared audio and delayed fallback install the identical per-attempt grid.

The previous attempt ends on its exact source bar boundary even if it is a fractional reference beat. A prepared future cue changes tempo and phase there; current audio runs until that boundary. A missed preparation advances by whole entry bars and plays every count pulse. No receipt can install a truncated or off-grid attempt.

Stage the next same-passage repeat before completion. Capture attainment snapshots when the previous phrase completes and save independently of prepared audio adoption. A failed save cancels subsequent playback and retains the achievement for retry. Source changes/new prerequisite preparation cancel the predicted repeat. Done/withdrawal changes only future rates; they rearm a future cue or use a complete fresh count if its boundary has passed.

Keep allocation and reclamation off native callbacks. One current and one bounded pending cue own exact origins; stale generation/owner receipts cannot replace or stop newer work. Pause, error, disconnect, settings, output change and disposal cancel owned pending work. Original integer native owner microseconds are retained through receipt/adoption rather than reconstructed by a floating-point round trip. A successful arm acknowledgement arriving during its already audible full cue can be adopted until that cue’s own score entry; a missing/late acknowledgement is targeted by its known token before whole-bar fallback. No second partial cue is substituted for an already scheduled complete cue.

## Risks / Trade-offs

Delayed fallback adds whole-bar silence rather than cutting a cue; normal-path timeline tests must show exact source-end cue start. Initial pickups can require a partial-bar lead after a full count bar; repeated pickups preserve the actual exit phase. Unestablished interior upbeat phases are conservatively treated as source downbeats. Irregular grouping is not invented where the model lacks authored grouping. Native/browser timing evidence cannot certify the user's physical audio/MIDI path.

## Migration Plan

Ship Viewer and native v2 together through the ordinary paired lane. Legacy absent-v2 requests keep literal prior semantics; mixed or malformed v2 admission refuses. Preserve previous application/data and all private archives; no autoarchive or native action from this source branch.
