# Carry hand changes to matching bars

## Why

A fingering entered in one bar already reaches the bars that play the same music. A hand change does not. Suppose a player moves bar 11's LH 4 and 3 in Schumann Op. 68 No. 13 (E4 at the second chord, D#4 at the third) to the right hand. Bar 21 is the same music on the return, yet it still shows them in the left hand, although the player would make the same change there.

## What Changes

- A hand the player chooses on purpose (the choice carries its recorded hand intent) also applies to every other bar of the score that plays the same music in both hands, from the downbeat to the end of the shorter of the two bars. The written hands count as part of the music. This lets bar 11, which holds the return pickup, match bar 21, which is written short.
- The carry is derived and never stored. No record is written for a receiving bar, and the player's records are never rewritten. Changes the player already made take effect at once wherever they match.
- The note's own choice wins: a hand chosen at a receiving note makes an exception for that note only. "Don't share this note's hand" keeps a hand to its own note. "Use bar N's hand" or "Share this note's hand" returns to the shared hand. The editor says where a hand came from, and a short notice names the note and the bars a change reached.
- A matching bar that could not be drawn with the carried hand is skipped and the reason is named. The change itself is not refused.
- Fingering memory regroups each receiving bar by the hands it now has and keeps the fingers the player saw.

## Capabilities

### Modified Capabilities

- `score-editing`: matching recurrences of a direct hand decision.

## Impact

Viewer personal assignments (effective hand), the personal memory session (actions `hand` with `local` and `handScope`), the fingering-memory hand-repartition path, editor text and its action buttons. There is no change to stored formats beyond one optional field (`handScope: 'local'`), and no change to source archives, notation, practice progress or settings.
