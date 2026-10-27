# Scripted rehearsal

`npm run rehearse` builds the viewer from this checkout and walks every score in a library the way a player would, in headless Chromium, against a simulated desktop host. It decides pass or fail by invariants, and reports timings and page counts for a person to read. There is no CI: run it before completing a change, and for a delivery also on the owner's data.

```sh
npm run rehearse                                   # the public scores in this repository
npm run rehearse -- --data <copy of the laptop data directory>
npm run rehearse -- --presses 300 --press-keys practice   # a longer early-press sweep
npm run rehearse -- --only <library id prefix>,…           # some scores only
```

Copies, reports and screenshots go to `$TMPDIR/sv-rehearsal-<mode>-<time>/` (`--out` chooses another place outside the repository): `report.json` with every check and timing, and `summary.md`. The command exits non-zero when an invariant fails.

## Layers

1. **The application declares its state** (`src/app-state.ts`). `#app` carries `data-screen` (startup, library, reader, practice), `data-dialog` (the open dialog's kind, such as `score-reading` or `practice-menu`), `data-score` (library id), `data-instrument` (piano or other), `data-layout`, `data-step` (fingers, sections, manual), `data-section` and `data-busy` (startup, reading, press, practice). `data-ran` counts each command run (`practice:2 toggle:1`), and `data-failures` counts failures the player was told about. These are invisible; the rehearsal never reads text or pixels to learn where it is.
2. **The driver** (`scripts/rehearse/driver.ts`) is the only code that knows screens and keys. Its verbs are `openLibrary`, `openScore`, `importScore`, `setLayout`, `choosePractice`, `chooseStep`, `sections`, `enterSection`, `back` and `toReader`. It moves as a player does: Enter on a focused library row, the arrows to walk the list of sections to the one wanted (Enter practises the list's selected section, not the focused element). Keys come from the application's own tables: the player's saved controls through `readControlBindings`, and the reader's command keys and practice-menu keys from `src/command-keys.ts`.
3. **The inventory** is discovered: scores from the data copy's library, sections from the list practice shows, piano or not from the declared instrument. The default data are the repository's `.tuna` fixtures and review scores, the ISO reference scores the viewer can prepare (`src/iso-reference-score.ts`) and an authored score for another instrument, imported through the application's own Import. A file Import refuses as drawn by an earlier engraving engine joins the library directly, as one saved before would, and the summary notes the refusal. Prepared scores are cached in `$TMPDIR/sv-rehearsal-cache/<ISO revision>/`.
4. **Invariants** (pass or fail) and **reports** (never gates), in `scripts/rehearse/rehearse.ts`.

The host (`scripts/rehearse/host.ts`, `page.js`) answers the frontend's native commands from the data copy: managed files, the assistance store in the native format, the derived-file cache and the file picker. MIDI, native audio and the piano sound are absent.

## Invariants

For every score and both keyboard layouts:

- the score imports (default data), opens and reopens, with its pages drawn;
- a piano score offers practice; Fingers opens and still draws after End takes it to its last measure; every listed section can be entered and draws its music;
- no error or refusal is shown, and the page raises no uncaught error;
- a score for another instrument offers no practice;
- **an early press runs exactly once:** P, E and F are pressed at moments swept around the opening dialog leaving. Each press is measured against that moment on the page's own clock. A press after the dialog left must run exactly once; no press may run twice. Presses while the dialog still showed are reported.

## Reports

Per score and layout: first open, reopen, the layout change where one happened, Fingers' opening, the number of sections, the median and slowest section entry, and the page count; per import its time; the early-press counts by when the press landed. The run's total time is in the summary.

## Owner data

`--data` copies the given directory into the scratch directory; the original is never written. Reports name owner scores only as "piano score A (<library id prefix>)". Never commit owner data, titles, fingerings, screenshots or report content; attach only the summary to a pull request.

## When the interface changes

Change the driver's verbs, and the declared state if a screen is new; keep the inventory and invariants as they are. If a key moves, change it in `src/command-keys.ts` or the default bindings, never in the driver. A new screen should declare itself through `appState()` and be tested in `test/app-state.test.ts`.
