# Internal-measure practice excerpts

The bounded planner can split an oversized source measure. Previously, ordinary
piano and manual sessions still requested a whole-bar clock for those sections,
which rejected their endpoints. Reading also selected all gestures in the source
bar, and active views displayed complete bars and internal exercise identifiers.

Ordinary originals and adjacent doubles now use the existing explicitly
source-linked excerpt clock when either endpoint lies inside a source bar or a
bounded exercise has a genuine held-source obligation beyond its display end.
Whole-bar exercises without an outgoing obligation, and legacy whole-bar
partitions, retain their strict ordinary clock. A source owner sounding
past a bounded display cut remains an obligation until its literal release;
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

## Whole-bar held-source repair

The final review also found the same early-release defect at ordinary barline
cuts. Current bounded originals and adjacent doubles now complete only after
every genuine overlapping source owner reaches its release. A shorter explicit
piano completion override is rejected. Their actual displayed and graded source
ranges stay fixed: a held tail adds neither later attacks nor later source bars.
Legacy whole-bar clocks keep their original admission behavior.

The active manual view now shows the isolated earlier-owner preparation cue for
whole-bar incoming holds as well as partial excerpts. Existing piano slot
retirement already respects unresolved obligations. A retained piano tie cue in
the final display bar now survives through the genuine source-held tail;
intermediate bars and legacy partitions retain their existing cue expiry.

The new session regressions use actual bounded planners. A section displaying
ticks `0..576` retains its independent held owner through `1008`; an adjacent
double displaying `0..1152` retains its owner through `1584`. They exercise full
piano performances, early-release rejection, incoming preparation without a new
attack, manual completion/Done, repeat audio duration, and unchanged legacy
clocks. Reading keeps its intentional junction windows for connections and does
not acquire a timing assessment.

The production browser inspector checks six actual incoming originals and
connections across ISO/TAB using literal XML written ties. It proves the source
owner IDs/releases and isolated cue ink, rejects unrelated cue attacks, and
preserves ordinary body ink/ranges. Its separate piano check runs the actual
DOM continuation method on production-engraved source geometry: a cue remains
at tick `769` after display end `768`, expires at genuine owner release `1200`,
and disappears after reset. That method check isolates a four-bar source range;
it is not an additional claim about the planner's section selection.

Restoring the old piano constructor fails the new `1008` completion expectation
at `576`. Restoring the old final-bar cue expiry fails the actual DOM check at
`769`. Temporary negative-control changes were restored before final checks.
The final focused rerun passed all 73 tests. The configured build passed on trial notation candidate
`6b2ed7e30d256118e2c1d91360271f63bc096382`. Final-source combined verification,
native timing and installed application acceptance remain separate gates.

```sh
/home/qqp/.local/bin/qq-job -- node --import tsx --test --test-concurrency=1 test/bounded-held-tail.test.ts
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/inspect-bounded-held-origins.mjs
```

The inspector closes its temporary Vite server and Chromium in `finally` and
writes the receipt, retained TAB screenshot and negative-control logs to
`/tmp/score-viewer-bounded-held-origins`.

Final held-source browser receipt SHA-256:
`f519a8d4a3b5965b9629ed246290b560d993b82e4089e69af83a4044224be858`.

## Final-source visible preparation check

Rechecking source `e666b23973c83e6e77960b6e7a3e89649b92405d` revealed that the
manual preparation cue was present in the DOM but squeezed out beside the
full-width score. It now occupies the existing separate held-context area above
the ordinary source body. The body fit accounts for the context and shared gap;
render failure clears the context. Source ranges, ownership, clocks and credit
are unchanged, including the existing legacy whole-bar behavior.

The enhanced inspector requires a visible, contained earlier-note SVG and a
contained source body. All six actual ISO/TAB original/connection cases passed,
with each preparation SVG measuring `180 × 100` pixels at the inspected desktop
viewport. The retained screenshot now visibly includes the preparation label
and original note. The piano final-bar continuation method and all 23 active
excerpt cases also passed on the final source. Twenty-three focused manual and
held-session tests and the configured build passed.

Receipts and screenshots are retained in
`/tmp/score-viewer-bounded-visible-held-e666` and
`/tmp/score-viewer-bounded-visible-excerpts-e666`. These are source-browser
observations, not installed/native or physical piano acceptance. The separate
generic two-voice seven-bar written-tie fixture still refuses admission on this
source because the geometry audit cannot find its stated heads across source
systems. That audit was preserved; this refusal is recorded in
`/tmp/score-viewer-bounded-held-origins-e666/generic-seven-bar-tie.json`.
