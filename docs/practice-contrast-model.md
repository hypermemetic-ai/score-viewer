# Similarity and contrast planning

`practice-similarity.ts` accepts identified original source sections (`id`,
`start`, `end`; bar labels are optional). It never discovers arbitrary sliding
windows or reads completion state. Notes match one-to-one at the same relative
onset and exact canonical sounding duration, after adding one constant semitone
shift to A for comparison with B. Duplicate unisons preserve multiplicity.
The chosen shift maximizes matches; ties prefer the smallest absolute shift,
then the smaller signed shift. Similarity is matches divided by the larger note
count, and only [75%, 100%) qualifies. Perfect transpositions are excluded.
Hands, fingerings, spelling and completion equivalence are separate concerns.
Unpitched originals have no semitone candidate; direct comparison reports that
unsupported case. Catalog discovery skips them without dropping the originals.

`practiceSimilarityPairs` returns every qualifying occurrence pair, including
distant repeats. Sparse relative timing/duration postings eliminate impossible
pairs before pitch comparison, without constructing a dense all-note matrix.
Input bounds match the section planner: 100,000 notes and 2,000 originals.
`comparePracticeSections` exposes the metric and the actual matched owner pairs
for diagnostics and episode generation. Discovery grants no practice credit.

`practiceContrastEpisodes(source, pair, {sourceIdentity, profile,
policyFingerprint?})` returns independent entries with an ordered A/B `clips`
tuple and the two `originalIds`. It consumes the shared section-planning profile
and sizing policy. The caller must supply the canonical source identity used by
its catalog. Identity includes that source, both original occurrence IDs, policy,
comparison shift, divergence episode and actual snapped clip ranges. A/B clip
IDs differ; earned progress and exclusions do not participate in identity.

A matching onset requires every note in both alternatives to match, including
duration and multiplicity. Six consecutive matching onset positions spanning at
least one source conducting pulse establish sustained reconvergence. Compound
meters use a dotted conducting beat. This is an initial engineering guard, not
a measured memory limit or inferred harmonic cadence. The next divergence has
its own entry and uses only the intervening genuinely shared trunk as its cue.
An isolated matching event cannot end the first episode.

Cue and continuation targets are each 2.5 sizing seconds at five distinct onsets
per second (12–13 onset positions). The shared boundary chooser snaps within the
available trunk or divergence episode; short cues and a difference at the start
remain short or empty. Earlier divergent sounding owners cannot be imported to
lengthen the cue. A bounded continuation may finish before every later difference
in a long, continuously divergent passage. Available source ends and sustained
reconvergence bound the continuation. Clip ranges can be asymmetric when an
alternative adds or omits an attack.

Clip records preserve source owner IDs and actual ticks, with `carryInNoteIds`,
`carryOutNoteIds` and `tieNoteIds`. They do not transpose playback, rewrite a
sounding duration, split a chord, invent an attack at a written tie continuation,
or import intervening distant music. Where a started owner can finish inside the
current episode, the endpoint extends to preserve that obligation. Owners whose
release crosses a reconvergence or section edge remain explicit carry obligations.
Transport and rendering adapters must honor those obligations; a clip record is
not permission to release a sounding owner at its display endpoint.

The tracked No. 14 fixture has three qualifying four-bar occurrence pairs:
5–8/53–56 and 21–24/53–56 each match 20/24; 13–16/29–32 matches 19/24.
All use shift 0. In 5–8/53–56, relative tick 456 begins a divergent ending;
one matching note at 480 does not terminate it. In 13–16/29–32, divergence 312
is followed by six shared onsets at 336–456; reconvergence at 336 separates a later
divergence 480 into a second entry. Its available shared cue starts at 336.
The initial shared boundary weights prefer the bar boundary at 432 to cutting
the preceding one-bar authored gesture, so the actual cue contains only two
onsets. This tradeoff needs musical inspection; neither choice establishes a
formal phrase. Neither choice rounds backward across the earlier difference.
Source pitches remain unchanged.

These pure modules do not implement A/B transport, complete-cycle attainment,
native playback or visual acceptance. Those remain catalog/controller/display
integration responsibilities.
