# Design

## Matching rule

For each written bar with deliberate hand changes (a hand differing from the written hand with recorded `intent.hand`, not `handScope: 'local'`), every other bar is compared over the stretch shared from both downbeats: `min(extent(donor), extent(other))` ticks. The comparison covers every note sounding in that stretch, including notes held into it, in both hands. Each note is compared by written hand, pitch, onset relative to the downbeat and duration. The two bars match when the lists are equal and every moved note starts inside the stretch. Each moved note then reaches the note with the identical tuple in the other bar.

Each alternative fails on the owner's data:

- **Whole-bar or fingering-memory keys** (including the extent). No. 13's bar 11 is 96 ticks because it carries the RH pickup to the return. Bar 21 is 72 ticks, and its pickup is written in bar 22. These keys never match the case the owner asked for.
- **Only the notes sounding with the moved notes.** In No. 14, bar 60 and bar 30 differ only in the downbeat bass (C#3 vs C3). The owner fingered bar 14 (identical to 30) differently from 60. That rule would carry across different music.
- **Pickup bars.** A pickup at the start of a bar shifts the downbeat alignment, so it matches only another bar with the same pickup. Material after the shared stretch (bar 11's pickup) is not compared and is never moved.

## Precedence and controls

The effective hand of a note is: the carried hand, then the note's own stored hand, then the written hand. A carried hand exists only when the receiving note has no deliberate hand of its own (`ownsHand`). An explicit local choice therefore always wins.

- **L/R on a carried note.** This records an exception with `handScope: 'local'`. Pressing the hand it already has does nothing.
- **"Only here" on a donor.** This sets `handScope: 'local'`, and the receiving bars return to their written hands.
- **"Use bar N's hand" / "Use for matching bars".** This clears the scope. At a receiver, the record is removed when the carry would give the same hand.
- **Undo.** Choosing the written hand at the donor removes the carry as well.

Every step is a journalled personal-memory intent, so it is saved, recoverable and reversible.

## Retroactivity

The carry is derived on every read and cached per package and hand-record set. Existing deliberate changes reach their matching bars as soon as this version opens. Legacy hand records without `intent.hand` predate deliberate intent and stay where they are. Opening a score registers nothing new in fingering memory: the projection is accepted with or without carried hands. The next edit registers the carried partition. `preservePersonalMemoryHandChange` keeps the fingers on the edited bar and on every bar whose effective hands changed.

## Drawability

When carried hands would leave a key in a receiving bar with one hand-less head and one handed head, the bar is skipped and listed with its reason. The editor's whole-score drawability check reads carried hands, so a skipped carry never makes another edit fail.

## Composition with the repeat fold

The fold (ISO PR #430 and its viewer counterpart) inherits edits through a source-to-folded note map. Carries read only the owner's stored records, never folded or inherited values. The fold should read effective hands (`handFor` / `effectiveAssignments`) and must not treat a carried hand as a new donor. For a verbatim repeat both paths produce the same hand, so applying both is idempotent. In both, an explicit local record wins.
