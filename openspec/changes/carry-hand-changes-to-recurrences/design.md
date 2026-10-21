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

## Practice and calculation

Practice (`personalPracticePackage`), the Fingers view (the projected package) and the pages read `effectiveAssignments`, so they play and prompt the carried hand. `pianoRequestAuthority` now also turns each carried hand into a personal-choice hand constraint for any request that passes the player's state. The calculator therefore keeps what the page shows: the carried hand, or the exception the player made there. Admission of a saved calculated edition passes no personal state and is unchanged.

## Older hand records (No. 14)

Hand records saved before recorded intent existed (No. 14 has seven) are not migrated and do not travel. Pressing R (or L) once on such a note records the choice with intent, and from then on it reaches matching bars (bar 14 → bar 30 in No. 14).

## Composition with the repeat fold (viewer #173, ISO #430)

#173 shows a verbatim repeat once. A note the player has not touched reads its twin's hand and finger on read (`repeatResolved`), and touched twins that disagree keep the repeat written out. Both mechanisms are derived and never stored. Together they give one answer per note, taking the first that exists:

1. **The note's own stored hand**, including an exception at a receiving note.
2. **A hand carried from a matching bar** (this change): only deliberate hands, not marked "Only here".
3. **The repeat twin's stored hand** (#173), when the note is untouched.
4. **The written hand.**

For notes the fold pairs, rules 2 and 3 name the same donor note, so whenever both apply they agree. A carried hand is never stored or treated as touched, so nothing is applied twice and nothing becomes a new donor.

The exceptions are the same in both:

- **An exception at bar 21** (L there, `handScope: 'local'`) is the note's own record. The twins disagree, so the repeat stays written out with bar 21 in its own hand.
- **"Only here" at bar 11** (`handScope: 'local'`) must not reach the twin either. Repeat inheritance must skip a hand whose choice has `handScope: 'local'`, and treat the twins as disagreeing (bar 11's own hand against bar 21's written hand), so the repeat is written out. This is the one rule #173 adds when it rebases on this change.
- **Hand edits on a folded seat** write the hand only to twins that already hold their own hand record. The others take it through rules 2 and 3, so a finger-only record does not become a hand donor.
- **Fingering memory** reads the player's own and carried hands, never repeat-inherited ones.

Whichever of the two merges second rebases and keeps this order.
