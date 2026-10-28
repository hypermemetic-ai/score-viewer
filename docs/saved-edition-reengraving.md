# Engraving saved editions again

Saved pages are derived output, and reproducing them byte for byte is not a goal. What must survive is the user's content:

- the score source;
- the hands and fingers an edition carries, including those the former fingering calculator saved;
- the player's own hand and finger choices;
- practice progress, settings and the library.

The viewer never calculates or infers hands or fingers. Fingerings in an edition are editor-provided content and are kept.

## When an edition is engraved again

A saved edition can stop opening because its pages no longer reproduce under the pinned engine. For example, ISO #383 split hand-change beams per hand, and ISO #386 (pinned at 2b21840) made the approved recipe carry source-owned hands, ordinary opening head masks and short-phrase system breaks: a saved approved-v3 or calculated-hand recipe without those keys is refused with "This saved engraving does not match the current shared engraving policy. Open the score again to engrave it afresh." The reader checks approved-v3 recipes against the current policy on opening (`src/package.ts`); pages drawn by an earlier engine are engraved again too (see below). ISO bee8c67 adds stem diamonds for dotted values, shared unison heads, hand corners and stacked shared-duration heads to that policy (#390–#392, #394), so every approved-v3 and calculated-hand edition saved at 2b21840 or earlier is engraved again on opening. ISO #421 (pinned at 53c4c98) makes note-gesture the production slur routing, so every approved-v3 and calculated-hand edition saved with the earlier optical-open routing is likewise engraved again on opening. Its #388 dynamics seating also moves the systems a retained no14-recovery recipe would draw today. In these cases the viewer engraves the edition again from its own content instead of refusing it. This happens in five places:

- opening the score;
- importing a score file (see below);
- choosing an edition under **Earlier editions**;
- choosing a pitch whose saved edition no longer reproduces;
- opening, importing or switching to a keyboard layout the edition lacks (see below).

### Importing a score file

Import follows opening's rule. A file whose saved engraving the current policy refuses, whose pages an earlier engine drew (`SavedPagesBehindPolicy`, an early-format file among them) or whose pages lack the score's repeat signs is engraved again from its own content when it is imported, so the score opens on current pages and its first opening from the library engraves nothing. A new score keeps the imported file under Earlier editions beside the edition engraved from it, as a new score that gained a keyboard layout does. Before 2026-10-27 Import refused such a file with the reader's refusal ("This saved engraving does not match the current shared engraving policy", for `fixtures/authored-calculated-preparation-v2.tuna`), although the same file opened from a library that saved it before was engraved again; and Import showed pages an earlier engine drew as stored, which the first opening then engraved again. Importing an early-format file whose notes the library's edition was already engraved from still opens the score as saved, without engraving it. When engraving the file again fails, pages an earlier engine drew, or pages that only lack their repeat signs, open as saved with the same notice as opening; any other refusal stays, as does a damaged or foreign file. A file for a score the library already holds is engraved again and then imported like any other edition of that score; the library's own editions stay saved.

### Pages an earlier engine drew

Saved pages are derived output, so pages the current shared policy did not draw are engraved again however faithfully they still read. Before 2026-10-23 only approved-v3 and calculated-hand recipes were checked against the current policy; every other view was admitted and shown as stored. A saved No. 14 edition (both views on the `janko-real-engine-no14-recovery-20261006` engine) therefore opened its conventional layout on 2026-10-06 pages with augmentation dots in bar 48 (LH 4· and 6·, RH 7· and 9·). Its Jankó layout looked current only because the player's hand choices there are drawn afresh by the personal projection.

`savedPagesBehindPolicy` (`src/package.ts`) names an admitted piano edition any of whose keyboard views has no approved or calculated-hand recipe: the no14-recovery engine, a retained approved v1 or v2 recipe, or pages with no recipe at all (an early-format edition). Admission still reads such an edition, so its content, journals and the tests built on these fixtures are unchanged. Opening it for display refuses it with `SavedPagesBehindPolicy`, on either keyboard layout, and engraves it again like any other refused edition. This happens when the score is opened, when an Earlier edition is chosen, and when a pitch is chosen. Preparing a score ahead of time in the library engraves such an edition again in a worker and keeps the engraving as a derived file; opening reads it instead of engraving, then installs it and says so as before (`docs/instant-opening.md`). Both layouts are engraved at once and the new edition is saved, so later openings admit it as it is.

For No. 14 the rebuilt views keep their journal keys (layout, profile and hand digests), so the player's hand and finger choices in the personal store stay attached as they were. The edition's own hands and both finger layers carry over unchanged. If engraving again fails, the score still opens on its saved pages and the reader says "This score couldn’t be engraved again with the current engraving, so it opened on its saved pages." Choosing an Earlier edition or a pitch falls back the same way. The failure is remembered for the rest of the session by archive digest (`keepSavedPagesBehindPolicy`), as pages that only lack their repeat signs are, so later openings read the saved pages at once instead of paying for another try.

### Pages another engraver drew

Policy keys don't name every engraver change. ISO 68db77e1 changed how slurs are drawn without changing any policy key, so editions with the approved-v3 recipe that 3bbe6a96 drew were still admitted as current. The personal projection draws fresh pages only where the player's hands differ from the score's own; where they equal it, it shows the saved pages as stored. After the 2026-10-28 delivery, No. 14 therefore showed the pre-68db77e1 pages on the conventional layout (printed bar 48's LH slur arched up toward the RH), and fresh pages on Jankó, where the player's hand choices differ.

Each keyboard view now records the engraver that drew its pages: `engraver` in its presentation descriptor, mirrored in the root manifest for the primary view. The value is `CURRENT_ENGRAVER` (`src/engraver-identity.ts`), the pinned ISO notation revision from `docs/source-provenance.json`, which `npm test` and `npm run build` check against the submodule first. Every producer of piano pages records it: a fresh piano import (`publishNativePianoScore`), an edition engraved again or transposed (`engraveEdition`), and a keyboard layout added beside existing views. A view that shows another view's pages (`shareKeyboardView`) copies that view's record. `savedPagesBehindPolicy` names an approved-recipe view whose record is not `CURRENT_ENGRAVER` as behind, and the edition is engraved again as described above: in the library's background work (`engraveAgainAhead`, then installed), on opening, on choosing an Earlier edition or a pitch, and on import. The edition's hands, fingers, journals and practice come along exactly as they do for any other edition engraved again. Once engraved again it records the current engraver, so it stays current until the next engraver update. The check compares two strings, so it adds nothing to opening or library start-up.

- **Editions saved before views recorded their engraver** carry no record, so they are behind once. Checking whether their pages match a fresh engraving would cost the same engraving, so they are engraved again without that check. On a private data copy drawn by 3bbe6a96 (checked 2026-10-28: four piano editions and one reading), the library left alone engraved again and installed all five in 48 s, against 41 s for the three that the policy keys alone flagged. A second visit took 10 s and engraved nothing again.
- **Calculated-hand views** need no record: admission replays their pages with the current engraver, and pages that differ already refuse.
- **Readings** (`instrument-reading-package-v1` and `-v2`) need no record: admission replays them byte for byte (see below).
- **Transposed editions** record the engraver on their own views. The original embedded in a transposed edition is not shown, so its pages are not checked; the original's own library edition is checked like any other.
- **Earlier editions** under the Earlier editions dialog are checked when one is chosen, as before, and engraved again then. The background work doesn't engrave them.

The reader declares `data-pages="earlier"` on `#app` while the open edition holds pages another engraver drew, and the rehearsal's invariant "the edition shown was drawn by the current engraver" requires it to be absent on every opening and reopening (`docs/rehearsal.md`).

Integrity is still checked first: member hashes, the linked source, and the original of a transposed edition. A damaged or foreign archive is refused as before, and so is a linked edition with no source. Only pages that don't reproduce, or a missing keyboard layout, are a reason to engrave again.

## Composer repeats a saved source lacks

Goldberg Var. 1 was encoded by hand in ISO with a double bar at m. 17 and a final bar, so editions saved from it carry no repeats. ISO now records Bach's repeats for that score (each half twice: `:||:` after m. 16, `:||` at the end) in `KNOWN_COMPOSER_REPEATS` (`vendor/iso-notation/src/scores/composer-repeats.ts`). Admission (`src/package.ts`) adds them in memory to the source and every keyboard view, through `withKnownComposerRepeats`, when the score's identity and bar grid match exactly and it carries no repeats of its own. The stored bytes stay as saved, so the entry id (the source's SHA-256), the hand identity and every personal, practice and performance key stay the same. Pages saved without the repeat signs are refused with "This saved engraving lacks the score's repeat signs" and engraved again on opening like any other edition. The rebuilt edition keeps the original source bytes and draws the signs. Engraving happens once: the rebuilt edition draws the signs, so later openings admit it as it is. If engraving it again fails, an edition refused only for its missing repeat signs still opens: its saved pages are shown as stored, without the repeats, and the reader says "This score’s repeat signs couldn’t be engraved, so it opened on its saved pages without them." That fallback covers only that refusal. An edition the current engraving policy refuses first (an approved recipe made before the current shared policy, like a Goldberg saved at 2b21840) keeps that refusal: if engraving it again fails, it does not open, as before. After such a fallback the source reads without its repeats for the rest of the session (`keepSavedPagesWithoutRepeats`), for every read, including the content reads that engrave an edition again (Earlier editions, a keyboard layout the edition lacks). An edition engraved again in that session therefore has no repeat signs, and is engraved again with them once a later session opens it. The next session tries again.

## Either keyboard layout

The conventional and Jankó layouts are two key layouts of the same piano, not two instruments. ISO notation reads the same on both, so the engine draws the same pages for both: `renderScorePresentation` takes no layout, and an engraving shows identical pages and note heads on each layout. Only fingerings can differ. There is no such thing as a Jankó-only score: every piano score opens on the player's layout, and importing, opening or switching layout never refuses because of the layout. When the edition has no pages for the chosen layout, its existing pages serve it:

- **Pages with no ink made for one layout** are shown as they are on the other layout. Nothing is engraved and nothing waits. The pages print pitch digits only; the reader draws fingers at the seats. A linked edition gains a view naming its own pages, seats and score (`shareKeyboardView`); its zip members stay the same and only the manifest names one more view. An early-format edition (manifest version 1, such as `fixtures/schumann-op68-no14.tuna`) is linked with its own pages for both layouts (`rebuildEdition` with `keepPages`). Its pages carry no recipe, so opening such an edition from the library engraves it again from its notes first (see above). Its Jankó view keeps its finger layer, and its fingers can still show in place of the pitch digits; its journal and practice move to the linked Jankó view, and the early score file stays under Earlier editions. Importing that score file again opens the score as saved.
- **Pages with ink made for one layout** (hands calculated for that layout: `derivedHand`, a performing-hand presentation, or a calculated-hand receipt) are engraved for the other layout. A linked edition at its original pitch gains the layout beside its own views, its own pages byte-identical (`addKeyboardView`). An early-format edition is engraved again for both layouts from its notes (`rebuildEdition`) and installed like an Earlier edition.
- **A transposed edition** is transposed again from its original for both layouts, as before.

Opening or importing never fails because of the layout. If the new layout's pages can't be made, the score opens on the pages it has, on their own layout, and the reader says "This score has no pages for the conventional layout yet and they couldn’t be made, so it opened on its Jankó layout pages. The fingerings shown are for the Jankó layout." Switching layout in Options still reports such a failure and keeps the current score.

Fingerings made for one layout (the Jankó operator fingers with their physical rows, for example) show on that layout only. The other layout shows none of them, and the player's own finger choices stay in their own layout's journal; nothing is lost. When a score gains a layout and its fingers stay behind, the reader says "Fingerings made for the Jankó layout show only on that layout."

## What the new edition carries

`src/edition-rebuild.ts` reads the edition's content with `readEditionContent`. That is the ordinary integrity check without the page replay, and its result is never displayed. The edition is then engraved with the approved engine through the shared production rules (`engraveEdition` in `src/score-transposition.ts`; transposing uses the same path). The new edition is engraved for the keyboard layout in use first and serves the other layout once that is engraved too, from the same earlier edition (see [Opening a score instantly](instant-opening.md)); a transposed edition serves both at once. Its pages use `approvedProductionIsoOptions()` and default tokens, exactly as a new import does, with beat lines at the score's own metre pulse (`meterPulseOptions` in `src/meter-pulse.ts`): a compound metre such as No. 14's 6/8 draws one line per dotted quarter, as its saved pages did, and a simple metre keeps the engraving's quarter pulse. The earlier recipe's other settings belong to the earlier pages and are not carried. The base edition's font, notices and reference recording carry over. A transposed edition keeps its pitch, and it is bound to the original the current score was made from or to its own original engraved again.

For each keyboard view:

- **Hands.** The hands the view showed become plain content of the new view.
- **Hands the engine refuses.** The approved engine refuses some calculated hands, for example a hand that crosses a rest written in its staff (`rest-unwritable`). In that case the view shows the score's own hands, and the earlier hands travel as the player's own hand choices for those notes.
- **Fingers.** The view's finger layer stays as edition content, bound to the new pages. If it can't stay, its fingers travel as the player's own finger choices.
- **The player's own choices.** They come along unchanged, and they take priority over the edition's.
- **The reading place.** It moves through bars, not page numbers (`personalForRebuiltEdition`): the view opens on the page that now holds the bar the player was reading, and the note they were editing stays selected. Their saved source anchors are found again by their notes and bar in the new seats. An earlier finger layer in their history comes along where it still binds to the new pages, exactly as the journal is checked when it is read; otherwise it stays with the earlier edition. On a private No. 14 Jankó journal, the page anchor, the edit point (in both the live journal and the edition’s snapshot journal) and its history layer all come along; before this, only the page number came along, and the page anchor, the edit point and the history layer stayed behind.

Page one keeps printing the notices the earlier edition printed (`editionPrintedNotices` in `src/title-area-clearance.ts`): those its recipe names in `printedNotices`, else those its saved page one shows, for an engine that kept no recipe. Without this, No. 14's pages printed all six notices its source carries instead of its two (Encoding, Reference), and the sixth lay under bar 1's measure number, slur and beam.

No title-area text may meet the music. `engraveClearOfTitleArea` measures page one after engraving: the ink of its title, subtitle, composer, performing instruction and printed notices against the ink of its systems, with 2 points of air. Text is measured generously, without font metrics. When the music reaches in, page one's header is made that much deeper (`headerHeight`; later pages keep theirs through `runningHeaderHeight`) and the score is engraved again; after three tries the engraving is refused rather than printed over. Fresh piano imports (`publishNativePianoScore`) are held to the same rule. No. 14, with its two notices, clears on the ordinary header, so nothing is engraved twice.

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

The library installs an edition engraved again in the background through this same install, when nothing is open and no other write is queued, so the first opening after an engraver update reads the new edition. A crash at any write leaves the library pointing at the earlier edition with every file it names unchanged; the next visit installs it again.

A pitch whose saved edition was made from an earlier engraving of the original, with the same hands at that pitch, is engraved again from the current original rather than opened against it.

The notice reads: "This score was engraved again with the current engraving. Your hands, fingers and choices came along." When hands or fingers moved into the player's choices, it adds "The edition's hands and fingers now show as your own choices." When choices could not move, it says "Your hands and fingers came along." and how many notes' choices stay with the earlier edition. If practice could not move, it says so too. An edition installed in the library says this the first time the player opens the score.

## Musical readings

A single-reading archive (`instrument-reading-package-v1`, for example an earlier Guitar Pro part) is admitted only when the pinned engine redraws its pages, owners and layout byte for byte. ISO bee8c67 draws dotted values with a stem diamond, so readings saved at 2b21840 or earlier stopped opening with "Reading page differs from its shared source preparation". On opening, such a reading is now engraved again from its own content (`reengraveReadingArchive` in `src/reading-package.ts`): the same `score.json` bytes, metadata, creation time, font, notices and page dimensions go through `prepareReadingPackage`, and the source revision must come out unchanged. The archive's other options and its tokens are the shared rules of the day it was drawn (no reading producer chooses tokens), so they are not replayed: a reading saved before ISO #421 (optical-open slurs), with a stroke weight changed since, or under an earlier engine id is drawn with today's rules (`currentReadingOptions` in `src/reading-options.ts`). The new archive is installed like any new edition (`stagePresentationInstall`); the earlier archive keeps its bytes and journal mapping. A reading's state and practice journals are named for the score alone, so the reader's place and practice stay, and the notice says so. An archive carrying any member the new archive would not keep, or whose source or policy no longer reads, keeps its refusal. `readEditionContent` reads such a reading for its content by drawing it with the pinned engine and today's rules instead of comparing pages; it records no admission receipt and its result can't be shown.

A dual reading (`instrument-reading-package-v2`, an ISO view and a tab view of one fretted part) is engraved again the same way through `prepareDualReadingPacket`: both views are drawn afresh, and the source files a Guitar Pro import kept (`guitar-pro/…`) carry over byte for byte. A dual archive carrying any other `reading/…` member, such as a page left from an earlier view, keeps its refusal.

## Removed

The following are removed:

- the #118 fallback that opened an earlier own-hands edition instead;
- its "can no longer be drawn" refusal;
- the strict page-replay gate on opening.

The page replay (`admitCalculatedHandEdition`) still admits calculated editions that do reproduce, so those open exactly as saved.

## Limits

- At ISO 2b21840 every refused edition in a private data copy (checked 2026-10-17) was engraved again with its saved hands and finger layers as edition content; none fell back to the score's own hands. At the earlier #383 pin most calculated hands fell back and travelled as the player's choices.
- The new pages follow the shared rules, not the earlier recipe's settings, so page breaks, header height and vertical placement can differ from the earlier pages (a private 3/4 score goes from two pages to three, with one system on the last page).
- Editions engraved from their own hands at another pitch have pitch-independent hand digests. Their personal, practice and performance keys therefore also name their transposed source (`src/state.ts`), so pitches don't overwrite each other's journals.
- A rebuilt edition has new pages. Practice and personal journals are keyed by edition. Journals under the earlier view's key are carried over, and journals saved under another key stay where they were.
- If engraving again also fails, the score is refused plainly and every edition stays saved.

The footer probe's saved calculated edition (`fixtures/footer-probe-calculated-edition.tuna`) was redrawn at ISO 0013cd6 (#432's measureDensity 'event-band-v1' and #431's handCornerRule 'within-octave' join the production policy) with its own hands and fingers by `test/support/footer-probe-edition.ts`; redrawn again at ISO 221058d, 5026e66 and 68d8f08, it differed only in its manifest `createdAt`. At ISO 3bbe6a9 its pages are drawn on denser lines (#480; no policy key changes), so the saved pages no longer reproduce and the probe would refuse them. It was redrawn from the 0013cd6 fixture with the same tool, keeping both keyboards' hands and fingers, and its hash in `src/footer-ink-probe.ts` was updated. Redrawn again at ISO 68db77e, it differed only in its manifest `createdAt`, so the fixture and its hash are kept. It opens through its receipt, so the native footer probe exercises the same receipt path.
