# Design

## Matching rule

The moves are grouped by written bar and by the hand the source writes them in. For each moved note `n` in bar `b`, the candidates are the notes alike in hand, pitch, length and articulation marks (indexed once per score). A candidate `q` in another bar `t` counts when:

1. **Same beat.** It stands at the same place in its bar, counted from the downbeat. A pickup bar starts `full − extent` ticks before its downbeat, so No. 13's opening B4 (bar 1) stands at the same beat as the pickup B4 at the end of bar 11.
2. **Struck with the same notes.** The notes the source writes in that hand at the note's own onset match, each with the same pitch, length and marks.
3. **The same neighbour on at least one side in that hand.** The notes at the onset just before the note, or those at the onset just after it, match, each with the same pitch, offset from the moved note, length and marks. The neighbouring onsets may lie across the barline. A side with no note never matches, so the opening pickup, with nothing before it, is decided by the note after it alone. The other side, notes further away and the other hand are not compared. The three signatures are cached per note.

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
- **The hand over the part of the bar both places share** (this change's first round). It refused a return over any difference anywhere in the bar, so one changed note blocked every identical note of the bar. Decided 2026-10-23: compare the note's neighbours only.
- **Both neighbours** (the second round). It refused a note whose hand goes on differently after it, such as No. 13 bar 11's left-hand D#4 at bar 21, and every opening pickup, since a return always has a note before it. Decided 2026-10-23: one matching side is enough.
- **Leaving out the notes struck with the moved note.** Then No. 13 bar 8's B3 would reach bar 10, where the same key is also struck as a held B3 in another voice; the copy would split one struck key between the hands.

## Effect on the public fixtures

Moving the first note each hand plays in each bar, against round 1 (the hand over the shared part of the bar) and round 2 (both neighbours):

- **No. 13 (MusicXML form): 107 rows (round 1: 107, round 2: 102).**
  - Against round 1, nothing is lost. The right hand's first notes of bars 6/7/8/16/17/18/23/31/32/33/39/47/48/49 reach one another. Each is a B4 sixteenth after a B4, so the note before it matches wherever that repetition stands on the same beat.
  - Against round 2, every loss comes back: the opening pickup ↔ bar 11's pickup, LH 2 ↔ 12, 22 ↔ 38 in both hands, and LH between 6/16/31/47 and 7/17/32/48.
- **No. 13 (written-out draft): 110 rows (round 1: 110, round 2: 102).** The same at its bar numbers: 1 ↔ 12, LH 2 ↔ 13, 23 ↔ 40, LH 6/17/32/49 ↔ 7/18/33/50. Right-hand first notes of 6/7/17/18/32/33/34/49/50/51 reach one another.
- **No. 30: 94 rows (round 1: 88, round 2: 90).**
  - Against round 1, nothing is lost. Gained: bars that open alike and part later (2/6/10/14/26/42 with 3/7/11/15/27/43; 4/12/28/44 with 8/16; 9 ↔ 17) and LH 32 ↔ 48.
  - Against round 2, it gains back the opening pickup's returns, LH 18 ↔ 34 and LH 2/6/10/14 ↔ 26/42, and adds LH 26/42 with 3/7/11/15/27/43.

The tests pin the full tables (`test/hand-returns.test.ts`).

## Speed

All of this happens in the existing per-score index: marks, alike-lists and each hand's onsets are built once, and each note's neighbour signature is cached. On No. 13 (778 notes, 54 bars) with 32 moves, deriving at open takes 2.6–5.3 ms (b15563e: 2.4–2.6 ms). Each further move takes 1.7–3.3 ms (b15563e: about 1.7 ms). In a production build with seven stored moves, opening No. 13 took a median 11.4 s (b15563e: 11.8 s), and reopening it took a median 0.25 s (b15563e: 0.23 s), over six opens and eighteen reopens each. Neither difference is noticeable.
