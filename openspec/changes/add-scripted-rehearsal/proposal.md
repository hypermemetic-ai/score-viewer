# Proposal

## Why

Every delivery so far re-scripted its own browser rehearsal outside the repository, so each one started from scratch, depended on whoever wrote it, and missed things the last one had learned (a key taken by another control while unit tests passed, a score that needs a tempo typed, a section never entered on one keyboard layout). The agreed design (2026-10-23) makes the rehearsal part of the repository, and it has to exist before the navigation overhaul changes the screens it walks.

## What Changes

- Add `npm run rehearse`: a committed rehearsal of the built application in headless Chromium against a simulated native host. It runs on the public scores this repository carries by default, and on a copy of the owner's data directory when given `--data <path>`.
- The application declares where it is through stable `data-*` attributes on its root element (screen, dialog, score, instrument, keyboard layout, practice step, section, busy), counts each command it runs, and counts failures it reports. Nothing visible changes.
- The reader's own command keys (P, M, C, S and the repeat keys) and the practice menu's keys move into one shared table that both the reader and the rehearsal read.
- The rehearsal is layered: a driver alone knows screens and keys; the inventory of score × layout × section is discovered from the library; invariants decide pass or fail; timings and page counts are reports for a person.
- Invariants: every piano score can be practised in both keyboard layouts, every section and Fingers; no error is shown; pages are present; a score for another instrument offers no practice; a press made as the opening dialog leaves runs exactly once.
- Owner data never enters the repository: reports and copies stay under the scratch directory, and the summary names scores only by kind, letter and library id.
- AGENTS.md gains a gate line; `docs/rehearsal.md` explains the layers and how to extend the driver.
- No CI and no GitHub workflow.

## Capabilities

### New Capabilities
- `scripted-rehearsal`: the committed rehearsal of the built viewer, its two data modes, its invariants and reports, and the state the application declares for it.

### Modified Capabilities

## Impact

- `src/app-state.ts` and `src/command-keys.ts` (new), small additions to `src/main.ts`, `src/practice-view.ts` and `src/manual-practice-view.ts`.
- `scripts/rehearse/` (new), `package.json` (`rehearse` script; `playwright-core` 1.62.0 as a development dependency, which uses an installed Chromium and downloads nothing).
- `tsconfig.json` type-checks the rehearsal with the build.
- AGENTS.md (one line), `docs/rehearsal.md`.
