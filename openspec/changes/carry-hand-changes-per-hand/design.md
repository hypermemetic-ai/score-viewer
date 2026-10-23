# Design

## Matching rule

The moves are grouped by written bar and by the hand the source writes them in. For each moved note `n` in bar `b`, the candidates are the notes alike in hand, pitch, length and articulation marks (indexed once per score). A candidate `q` in another bar `t` counts when:

1. **Same beat.** It stands at the same place in its bar, counted from the downbeat. A pickup bar starts `full − extent` ticks before its downbeat, so No. 13's opening B4 (bar 1) stands at the same beat as the pickup B4 at the end of bar 11.
2. **Same hand around it.** Over the part of the two bars that both share as seen from the two notes (`max(bar start − onset)` to `min(bar end − onset)`), every note the source writes in that hand and that sounds there, held notes included, has the same pitch, offset, length and marks. The other hand is not compared.

Then the move's hand is carried to `q`, unless `q` has the owner's own hand (`ownsHand`) or the result can't be drawn. The moves of one hand in one bar that reach the same bar `t` are carried there together, so the drawability check sees all the copies that hand brings; moves of the other hand in the same bar are matched, and checked, on their own.

### Articulation marks

A note's marks are read from what the source writes, never by id, tick or bar, so the same material reads the same wherever it stands:

- written value (type and dots), `tieStart`/`tieEnd`, and the tie chain's components relative to the note. A dotted quarter differs from a quarter tied to an eighth.
- `articulation` (staccato, accent and the like).
- each phrase or slur the note starts (`from`), ends (`to`) or lies under (`under`) in its own voice. The voice is read from `sourceProvenance.voices`, falling back to the same hand and voice number as the slur's first note.
- the grace group written before it: kind and each member's pitch, duration and slash.

A slur in the other hand is not part of the moved note's hand, so it does not block the copy.

### Alternatives

- **Whole-bar comparison in both hands** (the previous rule, and ISO's twin bars). It blocks returns where only the other hand differs, which the rule says must still match. It also ignores slurs.
- **Only the notes sounding with the moved note.** That would carry across bars where the same notes sit among other notes of that hand, which is other music.
- **Comparing beyond the bar.** Not done: the bar is the unit the editor names, and a wider window would need its own rule for where a passage ends.

## Effect on the public fixtures

Old against new, every pitched note moved in turn:

- **No. 13 (MusicXML form).** Gains: bar 11's pickup reaches bar 1, and bars 22 ↔ 38 now match in both hands. Losses: RH pairs between bars that differ by a grace note (6/7/16/17/31/32/47/48): each such bar keeps its true returns.
- **No. 13 (written-out draft).** No gains; the same grace-related RH losses.
- **No. 30.** Gains: the opening pickup reaches the pickup endings of bars 2, 5, 6, 9, 10, 13, 14, 25, 26, 41 and 42, and LH 18 ↔ 34. Losses: LH 32 ↔ 48 and 33 ↔ 49, where a slur runs into the first ending.

The tests pin the full tables (`test/hand-returns.test.ts`).

## Speed

All of this happens in the existing per-score index: marks and alike-lists are built once, and stretches are cached by `hand:from:to`. On a 778-note, 54-bar score with 32 moves, deriving at open takes about 4 ms (main: about 2 ms). Each further move takes about 3 ms, the same as main. Engraving a page takes about a second, so neither is noticeable.
