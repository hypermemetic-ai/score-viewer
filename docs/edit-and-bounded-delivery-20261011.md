# Editing and bounded practice delivery — 2026-10-11

Both changes are implemented and delivered through reviewed source merges, paired native publication and ordinary Windows activation. OpenSpec main specifications are synchronized; the completed changes are archived as `2026-10-11-edit-score-hands-and-fingers` and `2026-10-11-form-bounded-practice-exercises`.

## Delivered behavior

- Score viewing and editing are passive. Reading and Timed section practice own musical input interpretation. Up/Down moves between whole systems, including across pages. L/R persist the selected note's performing hand while retaining its finger and selection; digits retain their existing advance behavior. Ordered saves run outside the paint path. Hand/finger edits preserve earned progress; explicit player reset remains the way to remove it.
- Practice uses locally variable sections, every overlapping adjacent double, and independent contrasts between substantially similar original sections. Section sizing starts at 25 distinct horizontal onsets, with musical boundary evidence; simultaneous chord notes count once. Similarity uses at least 75% note agreement under one constant transposition and excludes exact equivalence. Contrast cue and continuation each target 2.5 estimated seconds, preserving actual source boundaries, divergence and held tails.
- X or the selector's accessible Include/Exclude control toggles one exercise. A restrained cancellation line and muted, anchored row identify exclusion. Included exercises contribute equal weight; exclusions remove denominator weight without claiming completion. Very long sparse previews use bounded rows and owned scrolling; ordinary four-bar previews remain continuous strips.

Five onsets per estimated practice second is an adjustable engineering calibration. It is not a scientifically established acquisition optimum or a promise of wall-clock duration.

## Source and packages

Editing [PR 79](https://github.com/hypermemetic-ai/score-viewer/pull/79), practice [PR 78](https://github.com/hypermemetic-ai/score-viewer/pull/78), and the clean-carrier local dependency repair [PR 80](https://github.com/hypermemetic-ai/score-viewer/pull/80) are reviewed and merged. The notation dependency is independently reviewed through [PR 359](https://github.com/hypermemetic-ai/iso-notation/pull/359) and [PR 360](https://github.com/hypermemetic-ai/iso-notation/pull/360).

| Identity | Exact revision or SHA-256 |
| --- | --- |
| Delivered viewer source | `683b15ec3f963915e484e490811381a663088354` |
| Pinned notation source | `08c2b34c6c96f59cd78c7231965016a29808ba3d` |
| Published native carrier | `bdd8e290570eebd7ce727aef3165b048fa78b069` |
| Frozen frontend digest | `b98331354bb9bd0d032b9186828c90ca28d9b7b8e9fb36e3605deecdbdbb6257` |
| Windows ZIP | `263968dec0837b48448f1039b7b9c92d0e5fcf77f7d9621d558b678bb28c02de` |
| Windows executable | `f04a8856a202117fbc09421c5a6c752ebe830aba85fd1b9923fd45e3cca72ff5` |
| Mac universal ZIP | `657be8f87a0d4e5456bfe43f3247839e6e13417840aeb1057a76c7621daaff62` |

[Native run 38118154420](https://github.com/hypermemetic-ai/iso-notation/actions/runs/38118154420) passed preparation, Windows, Mac universal and pair assembly. The complete actual pair was independently admitted and atomically published; actual served current/release metadata and both ZIPs were downloaded and byte-verified. Carrier branches are retained as release provenance and are not merged over the notation application's main branch.

## Verification and installed preservation

The combined runtime passed 953 tests and the carrier repair passed 27 tests. Types and production build passed. The full editing matrix exercised 240 real browser keystrokes across six score/layout cases, including independent rendering parity, ordered blocked saves, stale-work rejection and recovery. Fifteen final production-frontend practice cases passed, including contrasts, exclusions at three viewport widths, continuity and manual sparse previews. Strict main-spec validation passed all six specifications.

On the target Windows machine, all 485 files in the installed Windows candidate matched the admitted package. The usual desktop shortcut launched the candidate in the logged-in console. The actual native score, selector, overlapping doubles and A/B contrast preview were inspected; complete pedal and duration ink remained visible. Reader Back saved and Library Exit closed normally.

A closed backup captured all 829 managed files and the 479-file previous application before installation. The final closed-data audit found 830 managed files: every original file remains, with only the predicted new navigation sidecar and two library pointer leaves changed. Scores, existing personal hands/fingers, settings and raw practice history are preserved. The practice journals and the catalog's exercise progress are unchanged, and old long-run evidence is not relabeled. No practice run, exclusion or note edit was used to alter production history during acceptance. The previous application, data backup and original shortcut remain recoverable.

The usual shortcut now targets `%USERPROFILE%\ISO Score Viewer\0.1.0-viewer683b15ec-carrierbdd8e290-verified\iso-score-viewer.exe`. The app was left closed after verification, ready for ordinary launch.

## Performance and inspection limits

The measured editing performance was accepted for delivery without further tuning. On the named Linux Chromium warm-score benchmark, maximum finger p95 was 14.7 ms; maximum hand p95 was 315.9 ms. Correctness and save-order coverage passed. The 100 ms goal did not pass; actual native physical-keystroke latency was not measured.

Mac packaging, universal slices, signing/resource checks, runner launch and native font/audio probes passed; no Mac installation was performed. Physical MIDI, pedal, sound-to-ear and human musical acceptance remain untested. Browser IPC simulations and native artifact checks are distinguished from the actual Windows GUI observations above.

Private receipts and screenshots are retained outside the repository at `<private-state>/score-viewer-edit-and-bounded-delivery-20261011`. The independent actual-pair review has SHA-256 `f74aa1c5925effca2a21be592adfecda315c5e3d4fab4f338856a4de87164363`; served-byte verification `0c15ff3be04b2be38bee6cb9f658ea800abf19e8e3641c8b0c6e6113a4286359`; final managed-state audit `300bd40d9dbbf3b59643147df9360752196ff06562fa98715bf0105925b25916`. Private user score and backup content is not committed.
