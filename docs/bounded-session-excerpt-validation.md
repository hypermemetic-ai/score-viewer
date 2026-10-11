# Internal-measure practice excerpts

The bounded planner can split an oversized source measure. Previously, ordinary
piano and manual sessions still requested a whole-bar clock for those sections,
which rejected their endpoints. Reading also selected all gestures in the source
bar, and active views displayed complete bars and internal exercise identifiers.

Ordinary originals and adjacent doubles now use the existing explicitly
source-linked excerpt clock when either endpoint lies inside a source bar.
Whole-bar exercises retain their strict ordinary clock. A source owner sounding
past an internal display cut remains an obligation until its literal release;
the clock includes that tail, while displayed and graded new attacks remain in
`[start,end)`. Initial and prepared repeat audio durations include the same tail.
Earlier owners remain separate held preparation and never become new Reading
attacks. Groundwork trims source gestures and their attack/owner membership to
the admitted range.

Active piano and manual views use the exact source crop for these sections and
doubles. Headers show their actual source measure range with an `excerpt` suffix
for partial measures. Contrast A/B source labels and separate transport remain
unchanged.

## Verification

The source trial uses notation candidate
`6b2ed7e30d256118e2c1d91360271f63bc096382`; it does not certify or activate that
candidate. Seventy-five focused tests passed across the session clocks, Reading,
MIDI assessment, excerpt clocks, manual sessions and clock ownership, contrast
model/cycle/next behavior, and bounded integration. A final 43-test rerun passed
after the source-rendering fixture was finalized. The configured `npm run build`
also passed.

The new regression tests run every actual original and adjacent double planned
for two authored 32/4 measures. Genuine piano and generic manual packages include
an independent held voice. Piano section ranges are `0..768`, `768..1536`,
`1536..2304`, and `2304..3072`; the first and third require completion at ticks
1200 and 2736. The other two require held preparation. The partial double
`768..2304` requires both held preparation and completion at 2736. Tests exercise
full measured piano performances and complete manual clock loops, including
early-release failure, strict whole-bar admission and repeat audio duration.

The source-browser inspector mounts the production views and checks five actual
piano and eighteen manual ISO/TAB partial originals/doubles. It compares visible
piano head identities, Reading/timed attack bounds, manual source component ink,
exact SVG source endpoints, held preparation and source-based headers. The source
score JSON stays unchanged. The dual ISO/TAB fixture retains literal imported
notes and string/fret facts and uses one voice, consistent with its admission
rules; independent held polyphony is covered by the piano/generic-manual tests,
not attributed to TAB.

Reproduce the added checks from the checkout:

```sh
/home/qqp/.local/bin/qq-job -- node --import tsx --test --test-concurrency=1 test/bounded-session-clocks.test.ts
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-bounded-session-excerpts.mjs
/home/qqp/.local/bin/qq-job -- npm run build
```

The inspector writes its receipt and screenshots to
`/tmp/score-viewer-bounded-session-excerpts`. The final receipt SHA-256 is
`c99e7d611f08a57f89c77ed55aea0324ca6198f8259bff5469c132e5a312a105`.
The retained piano and TAB screenshots are `piano-active-excerpt.png` and
`manual-active-excerpt.png`; `manual-iso-active-excerpt.png` was retained from
the preceding successful ISO inspection of the same source fixture. These are authored wide-source,
source-browser observations. They are not installed application acceptance,
physical pianist performance, native timing acceptance or a judgment that the
extreme dense fixture is comfortable to read.
