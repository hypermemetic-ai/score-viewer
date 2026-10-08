# Proposal

## Why

Equal maximum-width slots waste space and make shorter measures look unlike their original engraving. Replacing four measures at once leaves no reading lead into the next music; the operator instead wants an atomic refill that uses retired space while keeping the measure being played fixed.

## What Changes

- Retain original internal measure geometry and one common scale. Keep the current measure's position and size fixed; arrange other whole measures only when new music is drawn, with no continuous sliding or repeated recentering.
- Replace canonical equal-width slot allocation in measured connected practice with a bounded allocator for up to four resident measures. Preserve clear source order, accessible identities and explicit nonconsecutive staff breaks through wraps, efficient 3–5-bar leaves, and longer joined passages. The prerequisite repair keeps practice notation free of visible individual measure numbers and shows selected range context outside it.
- Retire fully read older note ink at the same redraw that places incoming music. Separate visual retirement from sounding-note assessment: an actual held owner may continue after its old head, duration ink and annotations have disappeared.
- Retain a small source-owned tie continuation cue for a visually retired tied owner. Reserve its actual paint rather than its old measure's entire width; remove the cue at the protected measure's finish or the owner's sounding end, whichever comes first. Do not invent ties for untied or pedal-only holds.
- Preflight refill placement and reading lead before count-in. Choose the common scale and origin before playing; never solve a live placement failure by shrinking or moving the current measure, omitting incoming music, or waiting for a batch turn.
- Restore complete source notation for the current resident measures on ordinary Pause. Recover original source context for errors involving retired owners, without inserting retired old note ink over newly allocated measures.
- Preserve source packages, calculator/hand planning, assessment and hold durations, musical clocks/repeats, attainment and Done, queued speeds, input bindings, rotation, selector previews, and restored native installation.

## Capabilities

### New Capabilities

- `practice-refill`: Atomic source-faithful allocation of incoming practice measures around a protected current measure, with separate visual retirement and source-owned held-note cues.

### Modified Capabilities

- `practice-passage-display`: Replace the canonical fixed-slot replacement requirement with a protected current measure and atomic allocation; explicitly distinguish a held-note continuation cue from residual note ink, and restore complete resident windows on Pause. This capability is introduced by prerequisite `repair-practice-rendering` and is not yet a main spec. Its prospective delta is grounded in that change's exact requirement names; apply/sync this change only after the prerequisite capability is available, or reconcile their artifacts explicitly before integration.

## Impact

- Depends on the source-owned passage compositor, verified relation geometry and complete ownership registry from `repair-practice-rendering`. That repair remains separately reviewable and does not claim to implement this allocator.
- Viewer layout/state: `src/practice-window.ts`, `src/practice-view.ts`, `src/practice-passage.ts`, `src/practice-relations.ts`, plus a scoped transient layout helper. Numeric settings work remains in the rendering repair.
- Practice visibility: a narrow display-retirement adapter around `PracticeSession` visibility. Existing gestures are already grouped by written measure and hand; a multi-bar scale does not need a new fingering/calculator partition. Keep attack/hold assessment and saved pattern/progress identities unchanged.
- Tests and observations: real source intervals and tie owners, early accepted attacks, mixed hands/rests, changing widths, source-system joins, repeats, Pause/error restoration and rotated viewports. Observe actual Schumann No.14 and private Zelda in both available presentations; keep private content outside Git.
- Main source is the reviewed viewer extraction; ISO remains pinned at `da93cf9e0359d861987fd76611b59b14b6aedb92`. No notation/calculator API, package admission, dependency/lock/gitlink, authentication/provider/workflow or installation change is included. A repaired native release remains a separate delivery decision.
