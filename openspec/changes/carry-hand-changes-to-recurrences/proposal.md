# Carry hand changes to matching bars

## Why

A fingering entered in one bar already reaches the bars that play the same music. A hand change does not. In Schumann Op. 68 No. 13 the owner moved bar 11's LH 4 and 3 (E4 at the second chord, D#4 at the third) to the right hand. Bar 21 is the same music on the return, and it still showed them in the left hand. The owner said they would have made the same change there.

## What Changes

- A hand the owner chooses on purpose (the choice carries its recorded hand intent) also applies to every other bar of the score that plays the same music in both hands, from the downbeat to the end of the shorter of the two bars. The written hands count as part of the music. This lets bar 11, which holds the return pickup, match bar 21, which is written short.
- The carry is derived and never stored. No record is written for a receiving bar, and the owner's records are never rewritten. Changes the owner already made take effect at once wherever they match.
- The note's own choice wins: a hand chosen at a receiving note makes an exception there only. "Only here" keeps a hand to its own bar. "Use bar N's hand" or "Use for matching bars" returns to the shared hand. The editor says where a hand came from, and a short notice says which bars a change reached.
- A matching bar that could not be drawn with the carried hand is skipped and the reason is named. The change itself is not refused.
- Fingering memory regroups each receiving bar by the hands it now has and keeps the fingers the owner saw.

## Capabilities

### Modified Capabilities

- `score-editing`: matching recurrences of a direct hand decision.

## Impact

Viewer personal assignments (effective hand), the personal memory session (actions `hand` with `local` and `handScope`), the fingering-memory hand-repartition path, editor text and its action buttons. There is no change to stored formats beyond one optional field (`handScope: 'local'`), and no change to source archives, notation, practice progress or settings.
