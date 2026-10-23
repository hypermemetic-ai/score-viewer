# Carry hand changes to every return of the same hand's passage

## Why

A hand change reaches another bar only when that whole bar is the same music in both hands from the downbeat. So it misses returns where only the other hand differs. It also misses the pickup into a return, which is the same note as the opening pickup but sits at the end of a full bar. And it ignores articulation, so a bar with the same notes but other slurs or staccatos takes the change as if it were the same passage.

The rule (decided 2026-10-23): when a note is moved to the other hand, the change applies wherever the passage comes back with the same note, the same written duration and the same articulation. The comparison is made per hand: only the moved note's hand has to match at that place, and differences in the other hand do not block the copy.

## What Changes

- Matching is per hand and aligned on the moved note. A note at another place receives the change when it is the same note: pitch, length, written value and ties, articulation, the slurs it starts, ends or lies under, and the graces written before it. It must also stand on the same beat of its bar, among the same notes of the moved note's written hand over the part of the bar both places share, with held notes included. The other hand is not compared.
- A pickup into a return matches the pickup it repeats. Bar places are counted from the downbeat, so a pickup bar's first note lines up with the last beat of a full bar and never with a downbeat.
- Moves made in each hand of one bar travel separately, each to its own hand's returns. The editor names, for each moved note, the bars it reached.
- Nothing else changes. The carry is still derived on read and never stored, the owner's own hand at a return still wins, undoing the original still undoes every copy, and bars that can't be drawn are still skipped and named.

## Capabilities

### Modified Capabilities

- `score-editing`: matching recurrences of a direct hand decision.

## Impact

Viewer personal assignments only (`src/personal-assignments.ts`): the recurrence index and matcher, and a new `reach` map that the editor's "shared" provenance reads. No change to stored formats, source archives, notation (ISO is untouched), practice progress or settings.
