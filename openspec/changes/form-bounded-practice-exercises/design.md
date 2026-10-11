# Design

## Context

The separately prioritized `edit-score-hands-and-fingers` change delivers source-guarded effective personal assignments and passive viewing first. This change consumes that resolver rather than introducing another hand authority. Exercise claims incorporate effective hand content for their own spans; historical raw claims remain recoverable and finger-only edits retain existing attainment meaning.

See `proposal.md` for motivation and the two delta specs for behavioral contracts. `src/practice.ts` and `src/manual-practice-plan.ts` currently choose nominal four-bar sections with nearby 3–5-bar alternatives. They avoid held notes and short source gestures but have no formal phrase or harmony detector. `passageHierarchy` validates a nonoverlapping recursive tree; `reconcilePassages` grows it indefinitely. Neither overlapping doubles nor distant contrast excerpts fit that representation.

Visible Total in `src/practice-display.ts` weights original leaves by source duration. Assessment attacks retain each pitch, while sizing needs unique score attack ticks. Saved piano plans distinguish `fixed-four-v1` and `connection-boundary-v1`; manual plan revisions also incorporate the partition. Context restoration and journal admission rely on old hierarchy identities. These are migration responsibilities, not reasons to leave retained users on the old behavior.

The model already provides intended note starts/durations, source voices/hands, written measures, actual rests versus skips, meter/repeat/barline overlays and authored slur/phrasing spans. Those spans are not a formal phrase tree. Application analysis can use these facts without changing the pinned notation dependency.

## Goals / Non-Goals

**Goals:** Share musical planning between supported practice modes; make the new catalog deterministic and source-bound; preserve raw evidence; produce inspectable boundary reasons; integrate contrast excerpts into existing preparation, transport, grading and source-faithful display rules.

**Non-Goals:** Full tonal/cadence analysis, a scientifically validated universal learning capacity, a new user tempo policy, fingering recurrence editing, bulk exclusion tools, a sweeping selector redesign, or changes to provider/authentication/workflow configuration. Native deployment remains the established separate delivery path.

## Decisions

### 1. Separate a versioned musical catalog from runtime assessment

Introduce application-owned planning modules for workload/boundaries and the exercise catalog. A catalog entry has a stable source-bound ID, kind (`section`, `connection`, `contrast`), source excerpts, component/original IDs, boundary reasons and prerequisites. Include the policy version, actual source ranges and contrast episode in identity. A contrast has two excerpts rather than a fictional contiguous range spanning distant source music.

The new partition/policy fingerprint binds planner constants and source facts. Freeze a saved catalog's policy until an explicit version transition; changing a backend constant must not silently reinterpret existing journal keys. Keep assessment pitches, sounding/carry obligations and hand/group identity in their existing adapters. The manual planner consumes the same musical catalog, applying its genuine technique/owner constraints. Where a score lacks pitched streams, local/source signals still supply a valid fallback.

Alternative rejected: relaxing tree overlap checks alone. Coverage, browsing, progression, context restoration and completion would still incorrectly assume a tree.

### 2. Onset workload plus bounded musical evidence

Initial policy constants are rate 5 onsets/estimated-second, section target 5 seconds, preferred 4–6 seconds, cue target 2.5 seconds and continuation target 2.5 seconds. For a source span containing N distinct intended attack ticks, sizing duration is N/5. Reference-performance tempo cancels under this full normalization; it remains authoritative for actual transport and player-selected speeds. These constants are calibration choices, not measured cognitive limits.

Construct candidate cuts at genuine source boundaries, preferring written bar boundaries and meaningful beat/gesture boundaries when unusually large bars need subdivision. Never divide a simultaneous attack. Preserve any real carry/tie/technique obligation through source-aware excerpt endpoints; avoid cutting short connected gestures where a nearby safe alternative exists. Include actual written rests, but not spacer skips or fabricated gaps from ignoring another sounding voice.

Build an evidence profile from:

- Substantial repeating patterns in relative pitch/interval and timing, including exact transpositions. Preserve chord content and stream relationships for pattern analysis even though sizing counts chords once. Use melodic/voice streams and combined onset-set representations where available. Give exact detailed patterns more support than broad contour-only matches.
- Pattern significance based on span, independent recurrence and overlap. Tiny ubiquitous cells and many overlapping copies must not accumulate artificial certainty. Analyze several scales around the workload target with bounded candidate lengths and indexed/hash-based matching, not an unbounded dense all-note matrix.
- Local gaps, longer durations and register/texture discontinuities, plus authored repeat/meter boundaries. A slur or arpeggio leap is supporting evidence, not proof of a multi-bar formal phrase.
- Sustained change in windowed pitch-class/texture content as a harmonic-change proxy. A routine chord change alone has low weight and is not called a cadence.

Use a deterministic shortest-path/dynamic-programming partition over the candidate cuts. Its cost balances deviation from the target, a stronger penalty outside the preferred range, source-obligation penalties and capped boundary-evidence rewards. Strong agreement can retain a slightly short three-bar exception; unsupported long stretches cannot win solely because they contain more pattern matches. Select all cuts together to avoid tiny residual sections. Tie-break by stronger source safety/evidence, smaller workload deviation, then source order. No global powers-of-two grid or fixed measure count is imposed.

Record evidence components and policy values in bounded diagnostic output so review can explain each cut. Evidence strength means support, not a calibrated probability. Freeze numerical weights after bounded No14/mixed-score inspection; these tune the chosen approach rather than change its contract.

Alternatives rejected: duration at reference tempo alone (fast No14 favors 6–8 bars); raw individual-note count (chords distort horizontal workload); rhythm alone (uniform notes hide structure); full harmony inference as a prerequisite (unnecessary scope before a useful first model).

### 3. Keep section boundaries distinct from contrast divergence

Repeated-pattern starts supply ordinary boundary evidence. The end of an exact shared prefix does not automatically become a phrase boundary: it is often precisely the contrast anchor inside a phrase. This avoids breaking each ordinary section at the confusion point we want to drill.

For original section pairs, use one-to-one multiset matches of note events by relative start, duration and pitch under one constant semitone shift. Choose the shift yielding most matches; use deterministic tie-breaking. Similarity is matches/max(note counts), with qualifying interval [0.75, 1). Do not time-warp, align away missing events, combine changing pitch shifts or transfer attainment. Detailed exact-equivalence rules remain separately responsible for legitimate credit; similarity never weakens them.

Index plausible section comparisons by timing/count/pattern features and bound processing to admitted scores. Retain every qualifying occurrence pair, including distant occurrences. Do not collapse distinct occurrences just because another pair has the same pattern.

### 4. Generate source-faithful contrast episodes

Under the selected comparison shift, find divergent episodes and the genuinely shared material immediately preceding each. Choose a cue start near 12–13 onsets before divergence, using the same evidence profile at that smaller scale. Clamp it to the available shared trunk and section start; do not cross an earlier divergent episode to obtain a round measure count. If the difference is at section start, retain it with no invented shared lead-in.

Choose continuation end near 12–13 onsets after divergence, preserving the difference and source obligations. End sooner where matching resumes for a sustained musical group. Initial reconvergence guard: at least six consecutive matching onset positions spanning at least one source pulse, with grouping evidence where available. This is a configurable engineering guard, not a scientific claim. A single shared note cannot terminate the episode. Subsequent divergence after sustained reconvergence produces a separate episode/entry.

Snapping can produce asymmetric source excerpts when attack counts or safe boundaries differ. Retain real pitches, measures and intra-measure source positions; analysis transposition does not transpose playback. Preview the two alternatives with explicit A/B context. Transport alternates A then B with genuine count-in/re-entry at each discontinuity; never grade or render the intervening distant music as a connection. Reset attempt state and cancel obsolete prepared/audio work at transitions using existing lifecycle ownership. Credit an exercise only after a successful complete A/B cycle; MIDI failure or manual cancellation before both alternatives prevents cycle credit. Existing manual Done eligibility and queued-speed rules apply to that complete cycle.

Alternative rejected: replaying whole leading sections or stopping on the first coincidentally matching note. Both dilute the branch-selection exercise.

### 5. Doubles and progression are catalog operations

Create every neighboring pair of original IDs upfront, including A–B and B–C. Each pair has its own genuine contiguous source range and earned rate, with exactly two originals. Ordinary connection readiness uses actual original attainment; exclusion does not fabricate prerequisite completion. Preserve existing connection/start-speed meanings. No recursive pair-of-pair operation exists.

Recommendations skip excluded entries and use genuine readiness/attainment. Catalog totals include locked entries from the start. An excluded prerequisite remains selectable for practice, and related exercises remain independently excludable. Removing growing joins also retires the current library `whole` interpretation: old full-run claims remain historical evidence, not a computed promise that the new catalog certifies full-piece performance.

### 6. Exclusion and truthful equal-weight progress

Persist exclusion by canonical exercise ID, separate from pattern equivalence and attained rates. It cannot cascade to repetitions, components, pairs or contrast siblings. Compute Total as the arithmetic mean of included entries' capped own achieved-speed ratios, with the current Include manual presentation criterion. Library/save summaries use manual-inclusive results. Preserve exact-equivalence credit only when the new complete source-bound exercise satisfies its existing strict rules; contrast attainment remains independently bound to its A/B episode.

If no entries are included, show a quiet `No exercises included` state rather than 100% completion. Keep exclusion toggles at the current row position and preserve focus/scroll; when rebuilding a sorted list, retain excluded rows in their anchored slots instead of filtering or relocating them because of exclusion.

Selector treatment: subdued but readable text, a thin low-contrast cancellation line over the range label only, and a quiet Excluded state in detail/accessibility. No whole-row blur, decorative animation, completion checkmark or line through percentages/keyboard hints. Use existing row height, columns and focus treatment. Provide a restrained mouse Include/Exclude action and guarded X fallback for the hovered row, otherwise keyboard-selected row. Authoritative saved bindings, editors, modals, capture and key-repeat ownership take precedence; occupied fallback hints disappear. All `<kbd>` remain undecorated via shared styling. Visually inspect ordinary/narrow, selected/hovered and reduced-motion states in the real viewer.

### 7. Versioned, non-destructive evidence projection

Read and validate the old journal with its old planner before transitioning. Retain the raw legacy claims, manual marks, groundwork, composites and preferences in a recoverable legacy envelope; do not mutate source archives or personal fingering/library identities. Construct the new catalog, project only exactly matching full source-bound exercise claims, and persist the new state through the established ordered/atomic save path. Record the legacy origin and migration version so reopening is idempotent.

Do not distribute a long-run rate to its shorter subranges or stretch old section evidence onto new boundaries. Keep old exact-equivalence provenance intact and revalidate it against the new complete entries. New contrast entries start without earned claims. Preserve working/start/connection speeds, target and count/cooldown settings independently of resectioning. Update piano storage/context admission and manual revision lookup so retained users receive the new policy without appearing to lose their prior records. Map navigation only to exactly available ranges; otherwise return safely to selection.

Alternative rejected: switching the fresh default only, which leaves existing users on old growing sections; clearing journals, which loses evidence; retaining obsolete recursive joins in the current exercise list, which defeats the requested outcome.

## Risks / Trade-offs

- Ambiguous structure → Combine bounded evidence with workload fallback; inspect reasoned cuts rather than claiming full musical analysis.
- Equal onset counts have different learning difficulty → Keep this a backend sizing heuristic, preserve actual player tempo control, and evaluate later retention, branch errors and transition fluency rather than immediate loop success alone.
- Sparse/held material can have long real durations despite few onsets → Preserve source obligations and inspect sparse examples; estimated seconds are not guaranteed wall-clock practice seconds.
- Partitions change earned-percentage denominators → Explain included exercises; retain raw evidence and map only exact full exercises without inventing progress.
- Contrast clips begin/end inside measures or relations → Source-position identities, faithful context/carry cues and actual preview/active inspection are required before acceptance.
- Analysis cost on long works → Indexed bounded pattern candidates, compact diagnostics and resource-contained measurements; no quadratic resident all-event similarity matrix.
- Broad practice integration → Regression checks cover piano/manual planners, context restore, save ordering, count/repeat readiness and keyboard ownership.

## Migration Plan

1. Introduce the catalog and pure migration/projector with retained old readers and recovery records.
2. Integrate both planners, transport, selector, context restoration and all summary consumers before making the policy default for existing journals.
3. Verify migration twice, interrupted/failed-save behavior and exact protected-data preservation using representative copied journals outside managed personal data.
4. Inspect No14, irregular three-bar exceptions, dense chords, variable meter, sustained/polyphonic and weak-structure material. Validate A/B transport and restrained exclusion visuals in the viewer.
5. Complete the reviewed Git path and the now-authorized native build/publication/activation through the established delivery lane, binding the actual reviewed source/dependency and preserving user data. No planning receipt is a native acceptance claim.
6. Rollback selects the previous application/policy and reads the retained legacy journal; preserve any new-policy evidence separately rather than rewriting it into incompatible legacy claims.

## Evidence and Calibration

- [Cambouropoulos, 2006](https://www.researchgate.net/publication/277386111_Musical_Parallelism_and_Melodic_Segmentation): interval-pattern parallelism, length/frequency/overlap and revised start-oriented pattern boundaries. Principally melodic demonstrations, not a validated universal sectioner.
- [Pearce, Müllensiefen and Wiggins, 2010](https://research.gold.ac.uk/5380/1/p6507.pdf): compares grouping models and combines complementary evidence; listener disagreement supports an uncertainty-aware approach.
- [Chaffin and Imreh, 2002](https://production.wordpress.uconn.edu/musiclab/wp-content/uploads/sites/290/2013/10/Practicing-Perfection-Chaffin-2002.pdf): performance cues and divergence switches in one expert pianist; rationale for branch retrieval, not an onset-rate optimum.
- [Mishra, 2011](https://musicperformanceresearch.org/wp-content/uploads/2020/11/Mishra-Vol.-4-60-71.pdf): part/whole strategy comparison cautions against assuming smaller isolated segments always improve acquisition.

No study found establishes four or five onsets per practice second as optimal. Five rounds the accepted No14 four-bar calibration of 24/5 = 4.8 onsets/second. No14's 24-onset originals fit both candidate rates; future acquisition comparisons need material where the resulting boundaries differ.
