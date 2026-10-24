# Decide a hand press on a folded note over all its passes

## Why

One L or R on a folded note is applied once per pass. Each pass decided on its own whether the press gave it its written hand, so the pass applied second could read the hand it merely carried from the other pass as its own and keep a right-hand record "for this note only". Whether a record was left depended on which pass came first. A leftover record stops later copies and twins from reaching that note, without saying so.

## What Changes

- A press on a folded note names all its passes. Whether it gives the note its written hand is decided once over every pass, with none of their own hands, so a hand carried from one pass to the other cannot decide it.
- When it does, the first pass applied removes the hand from every pass and the others find nothing to store. Every order gives the same records.
- A hand carried to a pass from another pass of the same press no longer makes the choice an exception there.
- A press on one note, unfolded, is decided exactly as before.

## Capabilities

### Modified Capabilities

- `score-editing`: a hand press on a folded note.

## Impact

`src/personal-memory-session.ts` (the hand action gains an optional `passes` list, journaled with the intent) and `src/main.ts` (a folded press sends it). No change to stored personal records, notation, practice progress or settings. Pending intents journaled without `passes` replay as before.
