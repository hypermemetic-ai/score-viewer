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
`scripts/check-contrast-lifecycle.mjs`; this run does not manufacture earned
evidence or claim another lifecycle execution.

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

Reproduce after a configured build:

```sh
/home/qqp/.local/bin/qq-job -- npm run build
/home/qqp/.local/bin/qq-job -- node scripts/check-bounded-practice-guards.mjs
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-bounded-source-sections.mjs
```

The guard receipt and screenshots are under `/tmp/score-viewer-bounded-ui-guards`;
initial receipt SHA256 is
`60ed907433e393bab3dfdfc59073a36c2f225bba5db17396d27cb0aea6d5cc55`.
The symbolic source receipt/screenshots are under
`/tmp/score-viewer-bounded-source-sections`; initial receipt SHA256 is
`82ecc1f1dce3e06a8a38acc92cb57a46870796defd70f8f5be4361a931edb302`.
Scripts close their temporary servers and browser processes in `finally`.
