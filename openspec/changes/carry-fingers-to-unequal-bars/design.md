# Design

## Matching rule

The memory's hand projections of one score are compared in pairs of bars of unequal length that are not pickups. For extents `a < b`, both bars' projections are cut to their notes starting before `a`, and the cuts are compared by the library's measure key taken over that stretch: sorted pitch, onset and length. Within one score every projection shares the tick denominator, so the key compares tick counts directly rather than reducing ratios again. Equal keys mean the hand plays the same notes, by pitch, onset in the bar and length, from the downbeat to the end of the shorter bar. Each note in that stretch is paired with the note of the same pitch, onset and length in the other bar. Notes after the stretch are not paired.

This is the hand-change carry's stretch (`carry-hand-changes-to-recurrences`), applied per hand, which is how the memory already matches a hand. It uses the memory's own projections (notes starting in the bar), the hands the player has, and the canonical key's content, so onsets and the owner multiplicity are compared exactly as for exact matches.

## Downbeats

A pickup bar's first note is not on a downbeat, so comparing it from the start would match a pickup against the start of an unrelated bar. Hands and fingers use one rule, `pickupBars` in `personal-assignments.ts`, the hand-change carry's: a pickup is a short bar that opens the piece or follows another short bar (bar 22 after bar 21). Every other bar starts on a downbeat and is compared from its start, a lone short bar mid-score included. A bar's full length is its meter's, or the usual bar length when the source gives no meters, so a score without meters compares the same bars for hands and for fingers. A pickup matches only a pickup of its length, which the exact key already covers. The practice clock's pickup phase rule is not used: it does not identify bar 22 as a pickup.

## Meter

Meter is otherwise ignored. The rule is the same hand in the same bar: a 3/8 bar and a 2/4 bar match when the hand plays the same notes from the downbeat to the end of the shorter bar. Meter, or the usual bar length, only decides which bars are pickups.

## Resolution

After exact resolution, a hand projection's note without any finger of its own (local or shared, whole or hand) takes the donor note's shared finger: the donor bar's whole-measure shared field, then its hand field, with the donor's local exceptions skipped. The first donor bar that supplies any finger is used for the whole hand of that bar, so one bar never mixes donors. The result is `inherited`, names the donor field's reference, and counts as personal for editor controls.

- Changing a carried finger at the receiver: its reference is another bar, so the edit is a local exception there, as for any inherited value.
- Use shared at the receiver removes the exception and the carried value returns. A local exception at the receiver names the carried reference so the editor can visit it.
- Changing the finger at the reference publishes it, and the receiver reads the new value.
- An exception at the donor is not carried.

Donor-only bars outside a single-bar resolution are resolved in the same batch.

## Speed

The pairs depend on the bars and the hand partition only. They are cached per package and keyed by the hand projection identities, built with appends rather than copies, and each note's partner in the donor is found only for a donor that has fingers to give. On every resolve, each donor bar's shared fingers are read once, into a map by note, and a donor bar with none is skipped, so a score where many bars share a hand's opening and nothing is fingered costs about what it costs without the carry. On a synthetic 120-bar score in 2/4, 3/4 and 4/4 whose bars share the left hand's opening, a resolve took about 350 ms of CPU before this and about 65 ms after, against about 65 ms on main; reading the score again (pairs not yet cached) took about 390 ms before, and 55–90 ms after, against 35–85 ms on main. A test compares the CPU of that score with the same score whose hands match nowhere. On No. 13 with a player's fingerings the matching takes about 2.7 ms against about 90 ms for a whole resolution, and nothing after the first resolution of a partition.

## Refused carried hands

When the engraver refuses a carried hand (#175), its bar keeps its written hands for the session, which changes the bar's hand partition without changing any record. The resolution cache key includes the session's refusals (`handCarryGeneration`), and the refusal path resolves memory again before drawing, so the bar never keeps fingers resolved for the hands it no longer has. Bar 21 then plays bar 11's music in neither hand, and its fingers stay unshared; the notice that it keeps its written hands says so. Nothing is written.

## Composition

- Hand-change carry: carried hands partition the memory projections, so after bar 11's LH 4 and 3 move to the right hand, bar 21's carried hands match bar 11's hands and the fingers follow. The donor's whole-measure shared field keeps the fingers across the repartition.
- Repeat fold (#173): a carried finger is resolved by memory, so it counts as touched. Its value is the twin's shared value, so agreeing twins keep folding. A donor exception (a different finger in bar 11 only) makes the twins disagree, and the fold writes the repeat out, as an exception in either bar already does.
