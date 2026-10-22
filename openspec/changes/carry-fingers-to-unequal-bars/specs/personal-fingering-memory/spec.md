# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic complete musical matching
The viewer SHALL automatically reuse personal fingerings for exact whole-measure matches and matching individual hands, without a scope-selection or make-reusable step. Matching SHALL include all pitches, exact relative onsets, complete durations, measure extent and independent owner multiplicity in the selected scope. Nonmatching or ambiguously mapped material SHALL NOT receive guessed copies. Within one score, a hand's shared fingers SHALL also reach a bar of another length whose notes in that hand are identical from the downbeat to the end of the shorter bar, on that stretch only. A pickup bar, a short bar that opens the piece or follows another short bar, SHALL NOT be compared from its start, and hands carried to matching bars SHALL use the same rule. Meter SHALL decide only which bars are pickups, with the usual bar length where the source gives no meters; otherwise matching SHALL ignore meter. This reuse SHALL be derived when read and SHALL NOT be stored.

#### Scenario: One hand repeats under different accompaniment
- **WHEN** a measure's right-hand material matches a known right-hand pattern but its left hand differs
- **THEN** the right hand receives eligible shared fingers and the unrelated left hand stays unchanged
- **AND** hand-only reuse does not change performing hand

#### Scenario: Complete measure and sparse knowledge
- **WHEN** the whole measure matches but only some fields have shared choices
- **THEN** those fields are reused, matching-hand knowledge can fill holes, and calculated choices remain fallback elsewhere
- **AND** local exceptions precede shared values, whole-measure shared values precede hand-only shared values, and explicit suppression blocks fallback

#### Scenario: Inexact or ambiguous material
- **WHEN** pitch, onset, duration, measure extent or independent duplicate-owner multiplicity differs, or owner mapping is ambiguous
- **THEN** the affected scope is not treated as an exact reusable match
- **AND** transposed resemblance alone does not establish a match

#### Scenario: Same music in a bar written short
- **WHEN** Schumann Op. 68 No. 13 bar 11, which also holds the pickup to the return, has the owner's fingers, and bar 21 plays the same notes in each hand from the downbeat and is written short
- **THEN** bar 21 shows bar 11's fingers on every note both bars play, each hand matched on its own
- **AND** bar 11's pickup fingers stay in bar 11, and the return's pickup bar takes no fingers from a downbeat
- **AND** opening the score writes nothing, and a finger changed in bar 21 is an exception there while a change at bar 11 reaches bar 21

#### Scenario: Same music under another meter
- **WHEN** a bar in 3/8 and a bar in 2/4 play the same notes in one hand from the downbeat to the end of the 3/8 bar
- **THEN** that hand's shared fingers reach the other bar over that stretch, as for bars of one meter
- **AND** a score without meters, and a short bar mid-score that follows a full bar, compare the same bars for fingers as for hands

#### Scenario: A carried hand that can't be drawn
- **WHEN** the engraver refuses bar 21's carried hands and bar 21 keeps its written hands for the session
- **THEN** bar 21's fingers are resolved again for its written hands, and bar 11's fingers do not reach hands that no longer play bar 11's music
- **AND** the notice says bar 21 keeps its written hands and its fingers stay unshared, and nothing is written
