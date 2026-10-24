# Tasks

- [x] 1.1 Derive carried hands from deliberate hand records over the shared stretch of matching bars; verify No. 13 bars 11→21, context differences, pickup material, legacy and only-here records, and that no record is written.
- [x] 1.2 Add `handScope: 'local'`, local capture for L/R on carried notes, a no-op for an unchanged hand, and the `handScope` action; verify exception, only-here, use-shared, undo and reopen through the session store.
- [x] 1.3 Skip and report undrawable receiving bars; include carried hands in the editor's drawability check.
- [x] 1.4 Repartition fingering memory for receiving bars and preserve shown fingers; opening registers nothing new.
- [x] 1.5 Editor provenance text, actions and change notice; rehearse every score, section and Fingers on a private data copy, with ringed evidence for No. 13 bars 11 and 21.
- [x] 1.6 Turn carried hands into personal-choice hand constraints in `pianoRequestAuthority`; verify that practice packages and calculator constraints give bar 21 the hand the page shows, and that an exception there wins.
- [x] 1.7 State the composition with the repeat fold (#173): one answer per note, the same exceptions, no double application.

## Review round 1

- [x] 2.1 Speed: keep the carry with its hand-record object and by content per score; index notes, keys, pickups and stretches once; read one carried map per seat paint; compare only named notes for "did hands change"; derive local provenance without recomputing. Report micro-timings against main.
- [x] 2.2 A refused carried hand is dropped for the session and said, never written as a record.
- [x] 2.3 Moves inside the shared stretch travel when one in the pickup does not.
- [x] 2.4 Note-scoped controls and notices with distinct labels; "Use for matching bars"; bars throughout the edit toolbar.
- [x] 2.5 Pickup bars match only pickup bars of their length.
- [x] 2.6 The editor's hint at older hand records, without migration.
- [x] 2.7 A test pins own → carried → written; #173 adds the repeat twin when it rebases.

## Review round 2

- [x] 3.1 One rule for the player's own hand (`ownsHand`), asked by the carry and by `pianoRequestAuthority`; a hand saved with a finger before recorded intent is no choice. Nothing is rewritten on open.
- [x] 3.2 L, then R, at a carried note follows the matching bar again instead of keeping the hand for that note only.
