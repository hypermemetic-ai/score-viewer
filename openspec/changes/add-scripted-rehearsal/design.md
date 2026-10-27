# Design

## Context

See proposal.md for why. The only committed browser check before this change was `scripts/check-options-keyboard.mjs`, which serves `dist/` in browser mode and imports one generated score. Earlier delivery rehearsals simulated the native host (managed files, the assistance store, MIDI and audio commands) so the owner's data directory could be read as the desktop app reads it. Keys reach the application through one `keydown` listener in `src/main.ts`: assignable controls are resolved by `ControlResolver` from the saved control bindings; the reader's own commands (P, M, C, S, U, K) were letters written inline in that listener, and the practice menu's letters inline in `practiceMenu()`.

## Goals / Non-Goals

**Goals:**
- One command that rehearses every score, every layout, every section and Fingers, and that a future change to screens updates in one file.
- Declared application state precise enough to time a press against the opening dialog and to count how often a command ran.

**Non-Goals:**
- Pixel or golden-file comparison; playing notes through practice (no MIDI); native audio, PDF or file dialogs; the Mac or Windows shells themselves.
- Fixing defects the rehearsal finds in other areas; they are reported.

## Decisions

- **Simulated native host for both data modes.** The page gets a `__TAURI_INTERNALS__` that answers the commands the frontend uses from a working-copy data directory (managed files, a content-addressed assistance store in the native format, a derived-file cache, a picker queue). Studio scores are imported through the application's own Import (M) via the picker queue, so the library and editions are made exactly as a player's would be. A file Import refuses as drawn by an earlier engraving engine (the stale-edition fixture) is placed in the library directly, as a laptop that saved it before would hold it, and the refusal is reported as a note rather than failing the run. Alternative: browser mode with localStorage, rejected because the quota cannot hold several engraved scores and owner data is a native directory.
- **State on `#app` as attributes, written by one function.** `appState()` derives the declared state from the reader's variables; `declareAppState()` writes only changed attributes. `main.ts` calls it where screens, dialogs, openings, waiting presses and practice change; the practice views call it from `paint()` through an option. Alternative: a MutationObserver, rejected because practice repaints every frame.
- **Run counts, not events.** `data-ran` counts each command after its readiness wait, so a lost press shows as no increase and a doubled one as two. The in-page script records only the moment the opening dialog leaves and each key's arrival, both on the page's own clock.
- **One key table.** `src/command-keys.ts` holds the reader's command keys and the practice menu's; the driver reads it and the player's saved control bindings through `readControlBindings`, so a rebinding in owner data is honoured.
- **Inventory from the library.** Scores come from the library file of the data copy; sections from the list practice shows (`data-passage-id`); whether a score is for piano from the declared instrument.
- **Labels.** Studio scores are labelled with their public titles; owner scores by kind, letter and an 8-character library id prefix.
- **Browser.** `playwright-core` 1.62.0, whose Chromium revision matches the one already installed for the existing checks; it downloads nothing.

## Risks / Trade-offs

- [Simulation drift: the frontend gains a native command the page script does not answer] → unknown commands answer `null`, and an uncaught page error fails the run, so drift is seen rather than hidden.
- [Timing sensitivity on a loaded machine] → presses are measured, not assumed: each trial's offset to the dialog leaving is recorded, and the outcome is judged by that measured offset.
- [Headless Chromium is not the native WebView] → the rehearsal is evidence about the frontend; native delivery still needs the installed app observed.
- [Run time grows with the library] → the default inventory is the repository's public scores; owner runs are for deliveries.
