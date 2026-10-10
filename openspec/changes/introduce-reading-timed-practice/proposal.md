# Proposal

## Why

A one-time untimed introduction forces players to conflate learning note positions with playing a passage at tempo. Reading and Timed must remain independently selectable, with stable notation and clear keyboard controls, so learning the notes and practising musical continuity serve their different purposes.

## What Changes

- Replace once-only piano preparation with persistent Reading and Timed choices. Newly selected piano passages open in Reading; selecting a mode stops playback and Space starts or resumes that mode.
- Reuse genuine source-owned untimed position and adjacent-position evaluation for Reading, cycling again rather than entering Timed automatically or earning speed attainment.
- In joined Reading passages, cycle the last measure before each original boundary and the first after it. Show a quiet top-right `1/3` counter inside the reading area with accessible measure context.
- Emphasize Reading, Timed and Start/Resume in a centered primary control group; keep Free view secondary. Remove the generic preparation/ready instruction row and recover its height for notation.
- Add configurable piano Reading U and Timed T controls, with one shared Free view V control across piano, guitar and bass. Preserve rotation, existing saved controls, local navigation inheritance and input ownership.
- Use 30% starting speed for new Timed settings, 50% for genuine completed connections, and 2% increase. Preserve explicitly saved preferences and all historical progress.
- Require original component performance targets before newly unlocking connected passages; a parent's own completion cannot stand in for missing original component completion.

## Capabilities

### New Capabilities

None; this refines the existing practice presentation and interaction capability.

### Modified Capabilities

- `practice-passage-display`: replace once-only preparation and default-only Free view entry with selectable modes, authoritative configurable mode controls, stable shared framing and unobtrusive join context.

## Impact

Viewer-owned `practice.ts`, `practice-view.ts`, practice context/settings, shared binding admission and keyboard dispatch, CSS and meaningful source/browser controls. Keep the shared notation dependency and native configuration pinned. Instrument-neutral Guitar/Bass manual practice retains its existing capability-bound transport without inventing piano positions or MIDI assessment; shared styles must preserve its layout and controls. Native publication/activation uses the existing separately reviewed paired delivery lane after exact-source verification. Original packages, fingerings, personal identities, raw measured/manual attainment and saved journals remain intact.
