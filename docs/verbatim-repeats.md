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

The reader's pages and Save as PDF show the fold. Practice and Fingers go
through the folded edition as they go through a score with composer repeats:
each printed bar once, both endings where there are endings. A choice made
there is written to every twin that carries one, else to the first pass.
Saved navigation names written-out notes, so it stays valid whether or not a
repeat is folded.

Every bar number the player reads is the printed number of the pages shown:
seats, practice sections, Fingers ("measure N of 28" for Op. 68 No. 13) and
fingering-memory labels (`printedBar`). Op. 68 No. 13's stored bar 22 is
printed bar 12. Hearing the piece (Options → Tempo, from score-viewer #172)
plays the folded edition in performed order: the status counts printed bars
("measure 5 of 28 · 2nd time" for stored bar 15) and the playing bar is tinted
on the printed bar of each pass. It sounds exactly the notes of the written-out
score; a grace sounds on every pass through its bar.

## When passes disagree

A repeat whose passes carry different choices stays written out, and the reader
says why, for example "Bar 21 has a different finger than bar 11, so the repeat
is written out." The notice offers <kbd>U</kbd> Use bar 11's finger, which
copies the first pass's choice onto the differing notes so the repeat folds
again, and <kbd>K</kbd> Keep written out, which hides the notice for this
opening. A hand moved "only here" (`handScope: 'local'`) counts as such a
difference: its twin keeps its written hand.

## With carried hand changes

Score-viewer #175 carries a deliberate hand change to the bars that repeat it
(bar 11 to bar 21), also derived and never saved. Both read stored records only,
so they compose: the fold reads the owner's stored hand records, and a carried
hand gives a twin the same hand the fold would give it, so no note gets two
answers and nothing is applied twice. A hand kept "only here" is not carried by
#175 and writes the repeat out here. Whichever of the two merges second rebases
onto the other.

## Cost

A score that folds engraves only its folded pages and draws the player's hands
on them; both are then kept on disk. The written-out pages are not engraved as
well. A score that does not fold pays the fold check alone (about 10 ms cold).
Op. 68 No. 13 on the owner data, headless Chromium on a shared machine under
load 25–50, first open without a derived cache: 29.4 CPU seconds against 34.7
before (three folded pages instead of five written-out ones); wall times were
no slower than main in paired runs. A finger that splits or rejoins the passes
switches between already-drawn pages.
