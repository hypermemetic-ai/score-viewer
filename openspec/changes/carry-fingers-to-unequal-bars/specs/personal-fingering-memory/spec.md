# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic complete musical matching
The viewer SHALL automatically reuse personal fingerings for exact whole-measure matches and matching individual hands, without a scope-selection or make-reusable step. Matching SHALL include all pitches, exact relative onsets, complete durations, measure extent and independent owner multiplicity in the selected scope. Nonmatching or ambiguously mapped material SHALL NOT receive guessed copies. Within one score, a hand's shared fingers SHALL also reach a bar of another length whose notes in that hand are identical from the downbeat to the end of the shorter bar, on that stretch only. A pickup bar SHALL NOT be compared from its start. This reuse SHALL be derived when read and SHALL NOT be stored.

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
