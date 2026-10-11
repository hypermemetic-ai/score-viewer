# Bounded exercise browser inspection

This is source/browser evidence from an isolated checkout of Viewer `40a926d`
with test-authorized ISO candidate `6b2ed7e30d256118e2c1d91360271f63bc096382`.
It does not approve that notation pin, certify an installed package, establish
physical MIDI/audio/pedal acceptance, or pass a timing/latency gate.

The configured TypeScript/Vite build passed. The full emitted application ran
in fresh Chromium contexts at 1280, 800 and 480 CSS pixels by 720, with reduced
motion enabled. All three contexts passed actual `main.ts` keyboard dispatch:
hovered and selected exclusions, stable 35-row catalog order, preservation of
the existing best dictionary, modified-X guards, Options and numeric draft
guards, binding capture, assigning Options to X, positive Options opening
instead of exclusion, saved-X reload, and active Timed Speed editing through S.
Keyboard hints had no text decoration. Each viewport also retains a screenshot
with both exclusions active: the first row is hovered and the second selected,
with the original order and earned evidence preserved. The range has a separate
one-pixel `::after` strike line; range text and every keyboard hint retain
`text-decoration: none`. These screenshots are
`production-1280-excluded-rows.png`, `production-800-excluded-rows.png` and
`production-480-excluded-rows.png` in the final guard artifact directory.
The inspector uses only authored browser
storage and the public No14 archive with its real archive hash as filename.

The best dictionaries in this particular guard run were empty. Populated
attainment preservation and complete A/B credit are separate checks in
`scripts/check-contrast-lifecycle.mjs`; the guard script does not manufacture earned evidence. The lifecycle script
was also rerun after the preview repair: A errors cleared the paired attempt,
A alone earned no contrast claim, complete B earned only the owning claim,
auto-next and keep-tempo behavior passed, populated best rates survived
exclusion, and the manual ISO/TAB contrast retained its source clip and state.

Five authored symbolic fixtures were engraved by the pinned production engine
and mounted in the actual PracticeView. Each original section preview matched
the planner's range, and fixture source remained unchanged:

| Source | Notes / distinct onsets | Section onset counts |
| --- | --- | --- |
| Weak uniform eighths | 96 / 96 | 24, 24, 24, 24 |
| Four-note chords | 384 / 96 | 24, 24, 24, 24 |
| Irregular meters | 76 / 76 | 21, 17, 21, 17 |
| Meter changes in groups | 78 / 78 | 18, 24, 15, 21 |
| Sparse held notes and written ties | 13 / 9 | 9 |

The first two workloads produce three-bar sections. Meter evidence can produce
sections below the preferred four-second workload. The sparse fixture remains
one twelve-bar section; its initial 578 × 25.7 CSS-pixel preview is contained
but visually unreadable. At 480 pixels the No14 A/B preview is only 106 pixels
wide. Containment is not a readability result. These observations motivate a
source-faithful preview layout repair, without changing the musical exercises.

The repair chooses preview rows from the literal source-frame proportions and
available pane size. It calls the same source crop renderer for each contiguous
bar row and fits all rows at one common scale. All twelve sparse bars remain
present, including the final row with no note attacks. The four rows retain
all 19 written heads and their continuation identities. Each row is roughly
93–101 CSS pixels high. This improves inspection scale without claiming
pianist acceptance or changing section boundaries.

At 480 pixels the same two selector lists occupy the upper 30% of the browser;
the detail pane spans the full width below them and owns vertical scrolling.
The two No14 A/B previews remain separate, now approximately 179 × 111 pixels
each. The 35 catalog rows, selection, exclusions, focus, numeric fields, modal
ownership and saved binding guards passed again in the emitted application.
The ordinary 800/1280 layout is unchanged. A separate comparison loads the exact
prior browser/crop-fit modules from `40a926d` through read-only Vite modules:
four cases, covering both piano layouts at both widths, have identical source
viewBoxes, CSS geometry and all 24 source heads. It also reconstructs the sparse
before/after screenshots and confirms complete range and head retention.

The eight-bar authored manual connection was inspected in ISO and TAB at 1000
and 480 pixels. Every expected component ink ID remains in the source preview;
rows cover the complete clip contiguously and use a common scale. Switching
notation changes neither score source nor attainment. At480 pixels the entire
manual detail heading lies at14–173.6px inside its14–466px pane, with no
horizontal overflow. These are authored
workload examples, not evidence that the heuristics recover all musical forms.

Reproduce after a configured build:

```sh
/home/qqp/.local/bin/qq-job -- npm run build
PRACTICE_ARTIFACTS=/tmp/score-viewer-bounded-ui-guards-after /home/qqp/.local/bin/qq-job -- node scripts/check-bounded-practice-guards.mjs
PRACTICE_ARTIFACTS=/tmp/score-viewer-bounded-source-sections-after /home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-bounded-source-sections.mjs
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-bounded-preview-continuity.mjs
PRACTICE_ARTIFACTS=/tmp/score-viewer-contrast-lifecycle-preview-after /home/qqp/.local/bin/qq-job -- node scripts/check-contrast-lifecycle.mjs
```

The configured build and 17 focused preview/browser/cache tests passed. The
source fixture helper passed an ES2023 TypeScript check. Final inspection
receipts and screenshots are in the directories named above. SHA256 receipts:

| Inspection | Receipt SHA256 |
| --- | --- |
| Emitted-main guards after repair | `6942647287be4f4bcaf3b4913893650ca392c53cb7dfc9b07c6b4b434990a409` |
| Symbolic source and manual previews | `8dd002cf4d89d902ab4087c2206c8e27f7e5a2a4c7a4b2aec63b3ea28765b7af` |
| Exact prior/current preview comparison | `fb5cbc8572bd85d616a03e2257fd4bd61cf2319b5325e28b1c845487eeb0c500` |
| Contrast lifecycle after repair | `51b012c1499589e53dc153a897dc84532f5e4b33e89331e591a7e5bcbb730019` |

The initial narrow screenshot remains in `/tmp/score-viewer-bounded-ui-guards`;
its initial receipt SHA256 is
`60ed907433e393bab3dfdfc59073a36c2f225bba5db17396d27cb0aea6d5cc55`.
The exact sparse baseline is reconstructed in the prior/current comparison,
with the baseline module hashes recorded in that receipt. Scripts close their
temporary servers and browser processes in `finally`.

## Excluded row percentages

A scoped follow-up on integrated Viewer `0de581c` keeps each excluded row's
right-aligned percentage visible, with a compact `Excluded` status underneath.
The accessible row label still identifies exclusion. Cancellation remains on
the source range alone; percentages and keyboard hints remain undecorated.
The same emitted-main guard script additionally checks that both labels fit
inside each row and that every row retains its exact width and height across
hovered and selected exclusions. This checks the existing selector geometry,
not a new attainment rule.

The configured build passed with the same test-only candidate6b. The targeted
production guard run passed at 1280, 800 and 480 pixels with reduced motion and fresh
isolated storage, including authoritative saved-X, modal, capture and numeric
editor guards. Its best dictionaries are empty; numeric percentages are visible
at 0%, while populated attainment preservation remains covered by the separate
lifecycle evidence above. This run does not add installed, native timing or
pianist acceptance.

```sh
PRACTICE_ARTIFACTS=/tmp/score-viewer-bounded-excluded-percent /home/qqp/.local/bin/qq-job -- node scripts/check-bounded-practice-guards.mjs
```

The retained selected/hovered screenshots are
`production-1280-excluded-rows.png`, `production-800-excluded-rows.png` and
`production-480-excluded-rows.png` in that artifact directory.
The final receipt SHA256 is
`a40b6bf3bac63890026f8a8418799e866a791c392388110c193c6bfd89d70e52`.

## Sparse previews beyond the source renderer bound

A subsequent final-source inspection uses reviewed ISO source
`e666b23973c83e6e77960b6e7a3e89649b92405d`. A sparse original can legitimately
span more than 64 source bars. The previous preview requested the entire section
before deciding its presentation rows; the manual source renderer correctly
refused that oversized request. The repair partitions such previews before any
renderer call, into contiguous rows of at most four source bars. This is a
display partition, not a change to the practice sections. The source renderer's
64-bar guard remains intact, including every empty bar and partial endpoint.

Only previews containing a clip of more than 64 bars use an owned vertical
scroll viewport. Every row retains one common width-based scale, without
shrinking all rows to fit the available height. Normal previews retain their
existing fit. There is no horizontal overflow, and changing selection rebuilds
the preview so the long-preview styles do not carry into ordinary exercises.

`scripts/inspect-sparse-manual-preview.mjs` prepares an authored 66-bar source
with 22 distinct onsets through the actual dual-reading pipeline, then mounts
ManualPracticeView in ISO and TAB at 1000 and 480 pixels. All four cases pass:
17 contiguous rows cover the complete 0–12672 tick source interval, every source
component's ink remains present, renderer calls never exceed four bars, and
every row is reachable by scrolling at the same approximately 1:1 scale.
The source and attainment remain unchanged. Retained first/final-row
screenshots are in `/tmp/score-viewer-sparse-manual-preview-e666`; the receipt
SHA256 is
`a0e4599140c62626c56265fa3c7c94dc3d1d1d0eba4d7316262b673e879e1513`.

The configured final-source build and 29 focused browser/preview/cache tests
pass. Restoring the previous browser implementation makes this same actual
inspection fail at its first oversized renderer call. A separate 500-bar
partition test checks complete empty-bar coverage, partial endpoint clipping,
stable clip identity and bounded calls without engraving a giant fixture.
This establishes source/browser correctness, not installed native acceptance,
physical playing acceptance or an editing-latency result.

```sh
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-sparse-manual-preview.mjs
```


## Final integrated verification

The frozen application `7326f5c21375f6a417b157d1f0d3b4c57fa61801` with reviewed source `08c2b34c6c96f59cd78c7231965016a29808ba3d` passes all 953 configured tests (zero failed/skipped/cancelled) and types/build. Logs: `/tmp/score-viewer-combined-final-7326f5c-08c2b34-tests.log` (SHA-256 `430e4125ffd148536369622c1bf09353f3e4594d9590761d28167e7b9b432a96`) and `/tmp/score-viewer-combined-final-7326f5c-08c2b34-build.log` (`15ec0e875aa46e94fcab983dc557125292e4f67950cecec83b74a65ac4e2268c`).

Four unchanged final inspectors pass: three contrast lifecycle cases, three emitted-frontend guards at 1280/800/480 with reduced motion, four preview continuity cases, and five source/manual section cases. Their aggregate is `/tmp/score-viewer-frozen-7326f5c-08c2b34-inspection-receipt.json`, SHA-256 `4ed7ef2a57173110ddfa5a1d71d48ada9d0c0186dcfadb17bd9bfaf2e5ec722a`. All 19 emitted files exactly match frozen frontend digest `b98331354bb9bd0d032b9186828c90ca28d9b7b8e9fb36e3605deecdbdbb6257`. Actual excluded rows remain readable at 480 pixels, anchored in place with restrained cancellation lines and explicit exclusion status; shared kbd remains undecorated.

Final hand/finger, full-map/page-cache and off-grid Restore/Undo evidence is recorded in [fast personal editing validation](fast-personal-editing-validation.md). It preserves exact existing settings and credited work, with no automatic fingering/hand progress reset. Independent review approves the implementation and source preservation. These browser and source checks are separate from native package/installed acceptance and human judgments about optimal musical segmentation. Native activation remains pending until its actual delivery record exists.
