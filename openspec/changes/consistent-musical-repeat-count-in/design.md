# Musical repeat timing

## Context

See proposal.md. Existing browser and native repeats allow past count origins and skip elapsed clicks. Native and Viewer pulse-grid admission fix score offset to two reference beats; this fits Schumann 6/8 but not Zelda 3/4. Reference tempo units are clock units, not necessarily the meter beat.

## Goals / Non-Goals

Make every repeat audibly identifiable and musically phased, without normal-loop saving or stream setup shifting its boundary. Retain source/personal identity, queued speeds, first-loop Done and existing cancellation. Do not change device selection, driver or sampler policy.

## Decisions

Use v2 pulse metadata derived from source meter and exact source bars: reference pulses, metric beat starts, complete entry-bar length, metric count-beat length and entry pickup phase. A short entering source bar has phase equal to nominal meter length minus actual bar length; provide a complete count bar plus that phase, then enter without a false pickup downbeat. Compound meters group three denominator units; simple/irregular meters use denominator beats without inventing asymmetric grouping.

The previous attempt ends on its exact source bar boundary even if it is a fractional reference beat. A prepared future cue changes tempo and phase there; current audio runs until that boundary. A missed preparation advances by whole entry bars and plays every count pulse. No receipt can install a truncated or off-grid attempt.

Stage the next same-passage repeat before completion. Capture attainment snapshots when the previous phrase completes and save independently of prepared audio adoption. A failed save cancels subsequent playback and retains the achievement for retry. Source changes/new prerequisite preparation cancel the predicted repeat. Done/withdrawal changes only future rates; they rearm a future cue or use a complete fresh count if its boundary has passed.

Keep allocation and reclamation off native callbacks. One current and one bounded pending cue own exact origins; stale generation/owner receipts cannot replace or stop newer work. Pause, error, disconnect, settings, output change and disposal cancel owned pending work.

## Risks / Trade-offs

Delayed fallback adds whole-bar silence rather than cutting a cue; normal-path timeline tests must show exact source-end cue start. Pickups require extra partial-bar lead after a full count bar. Irregular grouping is not invented where the model lacks authored grouping. Native/browser timing evidence cannot certify the user's physical audio/MIDI path.

## Migration Plan

Ship Viewer and native v2 together through the ordinary paired lane. Legacy absent-v2 requests keep literal prior semantics; mixed or malformed v2 admission refuses. Preserve previous application/data and all private archives; no autoarchive or native action from this source branch.
