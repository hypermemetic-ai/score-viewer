# Carry fingers to the same music in a bar of another length

## Why

Shared fingering memory copies a hand's fingers to another bar only when the two bars are identical, length included. In Schumann Op. 68 No. 13, bar 11 also holds the right hand's pickup to the return, so it is a full bar, while bar 21 plays the same music and is written short: its pickup is bar 22. When a player fingers bar 11, bar 21 shows none of those fingers, although each hand plays the same notes from the downbeat. The check should be the same hand in the same bar.

## What Changes

- A hand's shared fingers also reach a bar of another length in the same score whose notes in that hand are the same from the downbeat to the end of the shorter bar. Bar 21 shows bar 11's fingers on everything the two bars both play. Bar 11's pickup is not compared, and its fingers stay in bar 11.
- Each hand is matched on its own, as exact hand matches already are. Equal bars keep sharing through their exact measure key.
- A pickup bar is never read from its start, by the hand-change carry's rule: a short bar that opens the piece or follows another short bar (bar 22 after bar 21). Meter decides only that; otherwise the rule is the same hand in the same bar, whatever the meter.
- When a carried hand can't be drawn and bar 21 keeps its written hands, its fingers are resolved again, stay unshared, and the notice says so.
- Derived on every read and never stored. Opening a score writes nothing, and no record of the player is rewritten.
- A note's own finger wins. Changing a carried finger is an exception there, Use shared returns to the carried finger, and a change at the reference bar reaches the receiving bar, as for exact copies. An exception at the donor stays there.

## Capabilities

### Modified Capabilities

- `personal-fingering-memory`: matching of one hand across bars of unequal length.

## Impact

Viewer fingering-memory resolution only (`src/personal-fingering-memory.ts`). No stored format, memory document, personal record, source archive, practice progress or setting changes. The matching follows the hand-change carry (`carry-hand-changes-to-recurrences`): from the downbeat to the end of the shorter bar, note by note by pitch, place and length.
