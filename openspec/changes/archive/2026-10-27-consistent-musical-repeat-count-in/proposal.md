# Consistent musical repeat count-in

## Why

The player cannot reliably reenter practice because asynchronous saving/output readiness consumes some or all count-in clicks. The fixed two-reference-beat count also breaks the bar phase of 3/4 music.

## What Changes

- Count at least one complete entry-meter bar before each attempt, using actual metric beats and source pickup phase.
- Prepare the next cue before the source phrase ends; continue on that exact bar boundary without an extra silent bar on the normal path.
- Preserve all cue clicks on delayed fallback by advancing whole entry bars; preserve exact fractional source boundaries and apply queued tempo at a musical boundary.
- Add an explicit v2 metronome protocol; retain honest legacy request admission without silently reinterpreting it.

## Capabilities

### New Capabilities

- `practice-timing`: source-meter count-ins, repeat preparation, pulse phase and cancellation.

### Modified Capabilities

None.

## Impact

Viewer score/pulse clocks, practice session/view scheduling, native request/mixer/metronome ownership and tests. No source archives, stored attainment, fingering, piano engine, audio-driver/device policy or global settings changes. Source, sample/event timelines and browser evidence remain separate from physical musical acceptance.
