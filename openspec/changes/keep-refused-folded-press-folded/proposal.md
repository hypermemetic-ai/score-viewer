# A refused hand press on a folded note leaves the repeat folded

## Why

When the engraver refuses a hand press on a folded note (L on the first B4 of bar 10 in No. 13: "That hand can’t be drawn on the page yet"), the reader wrote the repeat out, although nothing was stored. The folded pages' refusal was read as a fold that can't be drawn: the reader engraved the written-out pages instead, and returned the hand there. A refused press must leave the page as it was.

The step that returns refused hands also worked one pass at a time. Where only the return could not be drawn, it dropped the carry into that bar for the session, but the return still read the first pass's hand through the fold, so the refusal escaped unanswered and the refused hand stayed stored.

## What Changes

- A hand the folded pages can't draw is answered on the folded pages: the note returns to the hand it had, nothing is stored, the reader says why, and the pages are drawn folded again. A refused hand is not a failure of the fold: "its folded pages couldn’t be drawn" is not said and the written-out pages are not engraved.
- A refused note of a repeat the reader showed folded returns in every pass at once, as one press on the folded note (`passes`), so the passes never part and no pass keeps a record. A refusal naming one pass returns the press on all of them; no bar is dropped on its own.
- Opening a score whose saved hand can't be drawn returns it on the pages the reader shows, so a folded repeat opens folded.
- The success path is unchanged: one folded engraving per press.

## Capabilities

### Modified Capabilities

- `score-editing`: a refused hand press on a folded note.

## Impact

`src/main.ts` (`presentReader` can hand the folded pages' refusal back to its caller; `keepDrawableHands` returns a folded note's passes together and draws the pages the reader shows) and `src/repeat-fold.ts` (`foldedTwins`; a refused hand is not logged as a fold failure). No change to stored records, notation, practice progress or settings.
