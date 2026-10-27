# Tasks

## 1. Completed-group presentation model

- [x] 1.1 Derive maximal adjacent completed-original groups as presentation-only identities in the practice browser; verify singleton/multiple groups, unfinished connections within groups, exact source adjacency, manual display filtering and unchanged catalog/Total in focused browser tests.
- [x] 1.2 Build left/right category contents with incomplete connections before completed exercises, incomplete originals below left-side groups and retained access to contrasts and associated locked/eligible pairs; verify every existing exercise remains reachable, ordering is deterministic and originals are not duplicated in both lists.
- [x] 1.3 Separate group focus from concrete exercise selection and wire mouse/keyboard entry/return; verify group Enter/Right only opens contents, group Practice/Done/exclusion is unavailable, concrete Enter starts the selected exercise and selected IDs survive group merge/split and display filters.
- [x] 1.4 Render minimal Completed/Incomplete/Connections headings with existing Contrasts, no group percentages, no extra instructional wording and existing row/footer styling; verify category text, exclusions, empty groups and hints in markup tests, and update selector documentation in docs/practice-reading-timed.md.

## 2. One active exercise until explicit navigation

- [x] 2.1 Remove recommendation calls and successor gates from repeat prediction and ordinary timed completion, deleting obsolete continueTrial navigation; verify the production Schumann replay regression, first target-speed success, repeated target successes, newly unlocked connections and all-complete catalog retain the selected exercise while preserving historical achievement and admitted next rates.
- [x] 2.2 Remove recommendation/overview transitions after contrast completion while retaining A-to-B-to-A within the selected exercise; verify measured/manual cycles at low and target speed, full-cycle-only credit and stale generation/save guards with contrast lifecycle tests.
- [x] 2.3 Replace tests expecting automatic join activation or spying on removed continuation methods with explicit selected-identity assertions; verify pending/prepared repeat receipts, missing/late receipts, save failure, pause/close cancellation, held contacts, Done/undo races, queued and locked rates, Reading/manual behavior and explicit exercise selection. Update practice documentation to state that changing exercises requires player action.

## 3. Integrated inspection and delivery

- [x] 3.1 Inspect the real selector and replay behavior in the collaborative browser using a two-group fixture and Schumann 14; verify compact row counts, no synthetic group 0%, right-side ordering, no duplicated original, keyboard/mouse focus, contextual scrolling, preview stability, narrow/rotated layouts and no unsolicited instructional copy. Capture visual evidence and its limits.
- [x] 3.2 Run configured tests/build through the required resource launcher and the integrated production keyboard/repeat checks; verify source/dependency pins and preservation of saved evidence/settings, reporting source, browser and native evidence separately.
- [x] 3.3 Complete the scoped reviewed implementation PR path, reconcile the overlapping introduce-reading-timed-practice selector wording during spec synchronization and archive only completed work; verify final specs retain group exceptions and universal explicit exercise selection, and leave the independent fingering plan intact.
- [x] 3.4 Follow the repository's ordinary native build/admission/activation path without interrupting the current practice session; verify installed identity, preserved library/fingerings/practice data and actual selector/replay behavior, and report any blocked delivery or human acceptance separately. Evidence: the billing block was bypassed by moving native builds into this repository (#101); the change was delivered on 2026-10-14 (#103) and in every delivery since. The latest is the 2026-10-27 delivery 956bbe66 (#208), which seals app db86351 on ISO 3bbe6a96; paired native run 40577544036 succeeded for Windows x64 and universal Mac, and the Windows build is installed (docs/handoff-2026-10-27.md). The #208 owner-library rehearsal opened practice sections for every piano score on both layouts. Human acceptance is tracked separately.

Delivery status: implementation PR98 and native-test repair PR99 are merged; specs are synchronized. Native run38510326660 was refused before runner startup by GitHub account billing/spending limits. The active Windows viewer remains untouched. Task3.4 remains pending and the change is not archived; see `docs/practice-fingering-validation-20261014.md`.

Update 2026-10-27: the billing block was bypassed when native builds moved into this repository (#101). Task 3.4 was carried by the 2026-10-14 delivery (#103) and by every later one.
