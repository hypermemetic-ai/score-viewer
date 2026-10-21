# Design

## Matching rule

The memory's hand projections of one score are compared in pairs of downbeat bars of unequal length. For extents `a < b`, the longer bar's projection is cut to its notes starting before `a`, with extent `a`, and its exact measure key is compared with the shorter bar's key. Equal keys mean the hand plays the same notes, by pitch, onset in the bar and length, from the downbeat to the end of the shorter bar. Each note in that stretch is paired with the note of the same pitch, onset and length in the other bar. Notes after the stretch are not paired.

This is the hand-change carry's stretch (`carry-hand-changes-to-recurrences`), applied per hand, which is how the memory already matches a hand. It uses the memory's own projections (notes starting in the bar), the hands the player has, and the library's canonical key, so rational onsets and the owner multiplicity are compared exactly as for exact matches.

## Downbeats

A pickup bar's first note is not on a downbeat, so comparing it from the start would match a pickup against the start of an unrelated bar. A bar is compared from its start when it is complete or longer for its meter; when it is short and the next bar completes it (bar 21 with its pickup, bar 22); or when it is a short last bar that completes nothing. The first bar when short, the second bar of a completing pair (bar 22) and a short bar on its own are never compared. A score without meters compares nothing. The practice clock's pickup phase rule is not used: it does not identify bar 22 as a pickup.

## Resolution

After exact resolution, a hand projection's note without any finger of its own (local or shared, whole or hand) takes the donor note's shared finger: the donor bar's whole-measure shared field, then its hand field, with the donor's local exceptions skipped. The first donor bar that supplies any finger is used for the whole hand of that bar, so one bar never mixes donors. The result is `inherited`, names the donor field's reference, and counts as personal for editor controls.

- Changing a carried finger at the receiver: its reference is another bar, so the edit is a local exception there, as for any inherited value.
- Use shared at the receiver removes the exception and the carried value returns. A local exception at the receiver names the carried reference so the editor can visit it.
- Changing the finger at the reference publishes it, and the receiver reads the new value.
- An exception at the donor is not carried.

Donor-only bars outside a single-bar resolution are resolved in the same batch.

## Speed

The pairs depend on the bars and the hand partition only. They are cached per package and keyed by the hand projection identities. On the owner's No. 13 the matching takes about 2.7 ms against about 90 ms for a whole resolution, and nothing after the first resolution of a partition.

## Composition

- Hand-change carry: carried hands partition the memory projections, so after bar 11's LH 4 and 3 move to the right hand, bar 21's carried hands match bar 11's hands and the fingers follow. The donor's whole-measure shared field keeps the fingers across the repartition.
- Repeat fold (#173): a carried finger is resolved by memory, so it counts as touched. Its value is the twin's shared value, so agreeing twins keep folding. A donor exception (a different finger in bar 11 only) makes the twins disagree, and the fold writes the repeat out, as an exception in either bar already does.
