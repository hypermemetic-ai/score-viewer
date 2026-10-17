# Engraving saved editions again

Saved pages are derived output, and reproducing them byte for byte is not a goal (owner direction, 2026-10-17). What must survive is the user's content:

- the score source;
- the hands and fingers an edition carries, including those the former fingering calculator saved;
- the player's own hand and finger choices;
- practice progress, settings and the library.

The viewer never calculates or infers hands or fingers. Fingerings in an edition are editor-provided content and are kept.

## When an edition is engraved again

A saved edition can stop opening because its pages no longer reproduce under the pinned engine. For example, ISO #383 split hand-change beams per hand, and ISO #386 (pinned at 2b21840) made the approved recipe carry source-owned hands, ordinary opening head masks and short-phrase system breaks: a saved approved-v3 or calculated-hand recipe without those keys is refused with "This saved engraving does not match the current shared engraving policy. Open the score again to engrave it afresh." The reader checks approved-v3 recipes against the current policy on opening (`src/package.ts`); retained v1, v2 and no14-recovery recipes are unchanged. ISO bee8c67 adds stem diamonds for dotted values, shared unison heads, hand corners and stacked shared-duration heads to that policy (#390–#392, #394), so every approved-v3 and calculated-hand edition saved at 2b21840 or earlier is engraved again on opening. Its #388 dynamics seating also moves the pages of retained recipes such as No. 14's no14-recovery edition, which then no longer reproduce and are engraved again too. In these cases the viewer engraves the edition again from its own content instead of refusing it. This happens in four places:

- opening the score;
- choosing an edition under **Earlier editions**;
- choosing a pitch whose saved edition no longer reproduces;
- switching to a keyboard the edition lacks, at the original pitch. The edition's own pages stay byte-identical and only the new keyboard view is engraved.

Integrity is still checked first: member hashes, the linked source, and the original of a transposed edition. A damaged or foreign archive is refused as before, and so is one with no linked source. Only pages that don't reproduce are a reason to engrave again.

## What the new edition carries

`src/edition-rebuild.ts` reads the edition's content with `readEditionContent`. That is the ordinary integrity check without the page replay, and its result is never displayed. The edition is then engraved with the approved engine through the shared production rules (`engraveEdition` in `src/score-transposition.ts`; transposing uses the same path). The new edition serves both keyboards. Its pages use `approvedProductionIsoOptions()` and default tokens, exactly as a new import does; the earlier recipe's settings belong to the earlier pages and are not carried. The base edition's font, notices and reference recording carry over. A transposed edition keeps its pitch, and it is bound to the original the current score was made from or to its own original engraved again.

For each keyboard view:

- **Hands.** The hands the view showed become plain content of the new view.
- **Hands the engine refuses.** The approved engine refuses some calculated hands, for example a hand that crosses a rest written in its staff (`rest-unwritable`). In that case the view shows the score's own hands, and the earlier hands travel as the player's own hand choices for those notes.
- **Fingers.** The view's finger layer stays as edition content, bound to the new pages. If it can't stay, its fingers travel as the player's own finger choices.
- **The player's own choices.** They come along unchanged, and they take priority over the edition's.

## Installing

The new edition is installed like an Earlier edition (`stagePresentationInstall`). The earlier archive is handled as follows:

- it keeps its bytes;
- it stays listed under Earlier editions;
- it keeps its personal-journal mapping.

For the new edition:

- each keyboard gets its carried journal;
- practice moves from each earlier keyboard view to its new view where their journals differ;
- every pitch selection that named the earlier archive now names the new edition, on the keyboards it serves;
- when a transposed edition's own original was engraved again too, the original's journals travel with it.

Practice moves before the selection changes, so a rebuilt Earlier edition opens with its own progress. Practice that can't move stays with the earlier edition; it doesn't block the install. Closing the Earlier editions dialog cancels an engraving that is still running.

A pitch whose saved edition was made from an earlier engraving of the original, with the same hands at that pitch, is engraved again from the current original rather than opened against it.

The notice reads: "This score was engraved again with the current engraving. Your hands, fingers and choices came along." When hands or fingers moved into the player's choices, it adds "The edition's hands and fingers now show as your own choices." When choices could not move, it says "Your hands and fingers came along." and how many notes' choices stay with the earlier edition. If practice could not move, it says so too.

## Removed

The following are removed:

- the #118 fallback that opened an earlier own-hands edition instead;
- its "can no longer be drawn" refusal;
- the strict page-replay gate on opening.

The page replay (`admitCalculatedHandEdition`) still admits calculated editions that do reproduce, so those open exactly as saved.

## Limits

- At ISO 2b21840 every refused edition in a copy of the user's library (checked 2026-10-17) was engraved again with its saved hands and finger layers as edition content; none fell back to the score's own hands. At the earlier #383 pin most calculated hands fell back and travelled as the player's choices.
- The new pages follow the shared rules, not the earlier recipe's settings, so page breaks, header height and vertical placement can differ from the earlier pages (Zelda's Lullaby goes from two pages to three, with one system on the last page).
- Editions engraved from their own hands at another pitch have pitch-independent hand digests. Their personal, practice and performance keys therefore also name their transposed source (`src/state.ts`), so pitches don't overwrite each other's journals.
- A rebuilt edition has new pages. Practice and personal journals are keyed by edition. Journals under the earlier view's key are carried over, and journals saved under another key stay where they were.
- If engraving again also fails, the score is refused plainly and every edition stays saved.

The footer probe's saved calculated edition (`fixtures/footer-probe-calculated-edition.isoscore`) was redrawn at ISO bee8c67 with its own hands and fingers by `test/support/footer-probe-edition.ts`. It still opens through its receipt, so the native footer probe exercises the same receipt path.
