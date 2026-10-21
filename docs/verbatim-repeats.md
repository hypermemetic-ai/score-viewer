# Verbatim returns read as repeats

A stored score is written out. Where it writes a passage out twice, the reader
shows it once, as a repeat, using ISO notation's rule (`foldVerbatimRepeats`):

- the passage is at least 8 full bars (a pickup is no bar);
- it is played exactly twice: no nesting, no overlap, never three times;
- the two passes are identical, or differ only in their final bar, which is
  engraved as 1st and 2nd endings;
- when in doubt, it stays written out.

Repeats the composer wrote are kept as written and never judged by this rule.
The ISO fold proves itself (`verifyVerbatimFold`): the folded score, performed,
is the written-out score.

## What is stored

Nothing new. The score, its identity, the library entry and every choice the
player made (fingers, hand moves, practice progress, navigation) stay keyed to
the written-out notes. The fold is derived each time the reader opens a score,
and its pages are kept only in the derived-file cache.

## Choices on a repeat

Each folded note is shown by its twins, one in each pass (`src/repeat-fold.ts`).

- A note the player has not touched reads its twin's hand and finger. This is
  `repeatResolved`: derived, never saved, dropped on read like
  `memoryResolved`. A finger the player gave, restored, or shared through
  fingering memory counts as touched; edition fingers do not.
- Shared fingering memory resolves first. A note it resolves is touched, so
  memory and the repeat never both apply. Memory partitions read the player's
  own hands only (`projectPersonalMemoryScore` ignores inherited hands).
- Touched twins that disagree keep their repeat written out.
- A folded seat names the twins that carry a choice, else the first pass. An
  edit there changes every carrier, so agreeing passes stay agreed.
- Every change of choices is read again: a repeat is written out as soon as an
  edit (for example in Fingers, in the second pass) makes its passes disagree,
  and folds again when they agree.

## Where it shows

The reader's pages and Save as PDF show the fold. Practice, Fingers and playback
go through the written-out score in performed order, as before. Saved
navigation names written-out notes, so it stays valid whether or not a repeat
is folded. Folded pages number their printed bars, as any score with repeats
does (Op. 68 No. 13's printed bar 12 is stored bar 22); practice and Fingers
count the stored bars in playing order.

## Cost

The first open of a score that folds engraves the folded pages once and draws
the player's hands on them; both are then kept on disk. Op. 68 No. 13 on the
owner data (headless Chromium on a shared, loaded machine, with a derived
cache): first open 35.8 s against 19.4 s before; reopen 11.3 s against 13.3 s.
A finger that splits or rejoins the passes switches between already-drawn
pages.
