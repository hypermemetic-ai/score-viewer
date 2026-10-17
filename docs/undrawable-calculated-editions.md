# Saved calculated editions the engraving can no longer draw

The fingering calculator is no longer offered. The viewer keeps editing ergonomics and the fingerings an editor provided, either the player's own or the source's.

Some saved calculated editions can no longer be drawn by the engraving. ISO #383 (61e4d6e) refuses a calculated edition whose hand changes inside a beam used the old connector: `HandPresentationError` code `incompatible-recipe`. When the library's current edition is refused this way, opening the score does the following:

1. It looks through the entry's declared earlier editions, newest first, and takes the first one that:
   - is not a calculated edition on any keyboard;
   - has the entry's pitch;
   - opens, which means its editing session replays its saved pages.
2. It makes that edition current through the same install as **Earlier editions**. The refused file keeps its bytes, stays listed under Earlier editions, and keeps its personal-state mapping. Practice journals are keyed by edition, so progress on the earlier edition is used as it is.
3. It shows: "The calculated edition of this score can no longer be drawn, so it opened from its earlier edition with the score's own hands. The calculated edition stays saved under Earlier editions."

If no earlier edition qualifies, the library pointer is unchanged and the message says that the edition was made by the fingering calculator, can no longer be drawn, and that no earlier edition can be opened either. Choosing a refused edition under Earlier editions shows the same plain wording. No message routes the player to finger or hand calculation.

Limits:

- Finger edits that were made on the refused calculated edition stay saved with it. They are not carried over to the earlier edition.
- A transposition slot that still names the refused edition gives the plain refusal when chosen.

On 61e4d6e, Zelda's own-hands editions also fail the replay check, so Zelda cannot open there from any edition (2026-10-16). The cause is #383's phrase-aware system break, which reflows 8 systems into 9 and 2 pages into 3 under the unchanged approved engine.
