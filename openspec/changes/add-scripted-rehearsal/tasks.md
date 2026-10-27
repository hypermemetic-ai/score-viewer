# Tasks

## 1. The application declares its state

- [x] 1.1 Add `src/app-state.ts` (derive and write screen, dialog, score, instrument, layout, step, section, busy; count runs and failures); verify with `test/app-state.test.ts`.
- [x] 1.2 Move the reader's command keys and the practice menu's keys into `src/command-keys.ts` and read them in `src/main.ts`; verify with `test/app-state.test.ts` (no inline P or F letters remain) and unchanged keyboard behaviour in the rehearsal.
- [x] 1.3 Declare state from `src/main.ts` (render, library, dialogs, openings, waiting presses, practice start, failures) and from both practice views' `paint()`; verify with `test/app-state.test.ts` and the rehearsal reaching every screen.

## 2. The rehearsal

- [x] 2.1 Simulated native host and in-page script (`scripts/rehearse/host.ts`, `page.js`); verify the default run imports the public scores through Import.
- [x] 2.2 Driver (`scripts/rehearse/driver.ts`): openLibrary, openScore, importScore, setLayout, choosePractice, chooseStep, enterSection, back, toReader; verify by a full default run.
- [x] 2.3 Inventory, invariants and reports (`scripts/rehearse/rehearse.ts`, `studio.ts`); `npm run rehearse` exits non-zero exactly on a failed invariant; verify by a default run and by its JSON report and summary.
- [x] 2.4 Early-press sweep for P, E and F around the opening dialog leaving; verify the reproduction rate is recorded in the report.
- [x] 2.5 Type-check the rehearsal with `npm run build` (`tsconfig.json` include).

## 3. Documentation and gates

- [x] 3.1 `docs/rehearsal.md`: layers, data modes, reports, extending the driver.
- [x] 3.2 One AGENTS.md gate line: rehearse before completion; for deliveries also the owner-data run with its summary in the PR.
- [ ] 3.3 Gates green: `npm test`, `npm run build`, `npm run rehearse`; owner-data run once with its summary reported.

## 4. Early-press loss

- [ ] 4.1 Reproduce the lost press with the sweep and record the rate; diagnose its cause in `src/`.
- [ ] 4.2 If the fix is small and mechanical, land it separately and show zero losses and zero doubles over a few hundred presses before and after; otherwise report the diagnosis.
