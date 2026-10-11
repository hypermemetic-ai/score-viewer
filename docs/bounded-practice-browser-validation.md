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
Keyboard hints had no text decoration. The inspector uses only authored browser
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
| Emitted-main guards after repair | `b3eef1daa216241b04fe54972a5613937cac62f7a6a56c8e85a4b9e319f5452a` |
| Symbolic source and manual previews | `8dd002cf4d89d902ab4087c2206c8e27f7e5a2a4c7a4b2aec63b3ea28765b7af` |
| Exact prior/current preview comparison | `fb5cbc8572bd85d616a03e2257fd4bd61cf2319b5325e28b1c845487eeb0c500` |
| Contrast lifecycle after repair | `51b012c1499589e53dc153a897dc84532f5e4b33e89331e591a7e5bcbb730019` |

The initial narrow screenshot remains in `/tmp/score-viewer-bounded-ui-guards`;
its initial receipt SHA256 is
`60ed907433e393bab3dfdfc59073a36c2f225bba5db17396d27cb0aea6d5cc55`.
The exact sparse baseline is reconstructed in the prior/current comparison,
with the baseline module hashes recorded in that receipt. Scripts close their
temporary servers and browser processes in `finally`.
