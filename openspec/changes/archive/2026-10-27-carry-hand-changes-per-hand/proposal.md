# Carry hand changes to every return of the same hand's passage

## Why

A hand change reaches another bar only when that whole bar is the same music in both hands from the downbeat. So it misses returns where only the other hand differs. It also cannot line up a pickup bar with the last beats of the full bar it repeats. And it ignores articulation, so a bar with the same notes but other slurs or staccatos takes the change as if it were the same passage.

The rule (decided 2026-10-23): when a note is moved to the other hand, the change applies wherever the passage comes back with the same note, the same written duration and the same articulation. The comparison is made per hand: only the moved note's hand has to match at that place, and differences in the other hand do not block the copy.

## What Changes

- Matching is per hand and local to the moved note. A note at another place receives the change when it is the same note: pitch, length, written value and ties, articulation, the slurs it starts, ends or lies under, and the graces written before it. It must also stand on the same beat of its bar, be struck with the same notes of the moved note's written hand, and have the same neighbour on at least one side in that hand: the notes at the onset just before it or just after it, across the barline if need be, alike in the same respects. The other side, notes further away and the other hand may differ.
- A missing neighbour never matches a present one, so a note with nothing before it in its hand (the opening pickup) is decided by the note after it alone. Bar places are counted from the downbeat, so a pickup bar's first note lines up with the last beat of a full bar and never with a downbeat.
- Choosing the written hand where the note has no hand of its own stores nothing, and choosing it at a moved note removes the move. So L, then R, on a folded repeat leaves the stored records as they were.
- Moves made in each hand of one bar travel separately, each to its own hand's returns. The editor names, for each moved note, the bars it reached.
- Nothing else changes. The carry is still derived on read and never stored, the owner's own hand at a return still wins, undoing the original still undoes every copy, and bars that can't be drawn are still skipped and named.

## Capabilities

### Modified Capabilities

- `score-editing`: matching recurrences of a direct hand decision.

## Impact

Viewer personal assignments (`src/personal-assignments.ts`): the recurrence index and matcher, and a new `reach` map that the editor's "shared" provenance reads. The shared memory session (`src/personal-memory-session.ts`): a hand press that gives a note the hand it would show anyway stores nothing. No change to stored formats, source archives, notation (ISO is untouched), practice progress or settings.
