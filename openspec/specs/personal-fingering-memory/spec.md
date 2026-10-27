# Personal Fingering Memory Specification

## Purpose

Retain and reuse a player's fingering decisions for exact matching musical material, with understandable provenance, local exceptions and recoverable library state.

## Requirements

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
- **WHEN** Schumann Op. 68 No. 13 bar 11, which also holds the pickup to the return, has the player's fingers, and bar 21 plays the same notes in each hand from the downbeat and is written short
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

### Requirement: Additions contribute shared knowledge and modifications respect context
Entering a finger where no personal value exists SHALL add reusable knowledge even when a calculated finger is displayed. Changing an inherited personal value at a copy SHALL create a local exception; editing a shared value at its reference SHALL update it. Existing local exceptions SHALL remain local unless explicitly promoted or reset to inheritance.

#### Scenario: Complete a partially known measure at a copy
- **WHEN** a copied measure has shared choices on two notes and the player enters a finger on another note with no personal choice
- **THEN** the new field is shared with matching occurrences while the earlier fields and their donors remain intact
- **AND** the newly entered field retains its actual contributing occurrence and decision provenance

#### Scenario: Change inherited information
- **WHEN** the player changes an inherited finger at a copy
- **THEN** that occurrence receives a local exception and the shared reference remains unchanged
- **AND** later shared changes do not overwrite that exception

#### Scenario: Reference edit and independent exceptions
- **WHEN** the player edits a shared field at its reference
- **THEN** inheriting matching occurrences receive the new value
- **AND** a local exception, including one retained on a successor reference, is not implicitly published

### Requirement: Field-specific keyboard compatibility
Reusable hand/finger choices SHALL remain available across physical profiles of the same keyboard when musical matching is valid. Reused physical contacts SHALL require an identical immutable physical profile. A contact incompatibility SHALL NOT silently invalidate otherwise compatible finger knowledge or authorize copying incompatible geometry.

#### Scenario: Same keyboard with different physical geometry
- **WHEN** matching material is loaded with another physical profile of the same keyboard
- **THEN** eligible hand/finger knowledge remains reusable but incompatible saved physical contacts are not transferred
- **AND** travel advice uses admitted destination contacts or reports an unassessed gap

### Requirement: Explicit field authorship
New personal edits SHALL retain separate field intent, authored time and decision provenance. Displayed inherited or calculated fields that the player did not edit SHALL NOT become newly authored knowledge merely because another field changed. Copies SHALL retain their lineage and SHALL NOT count as independent personal decisions.

#### Scenario: Change hand while retaining a displayed finger
- **WHEN** the player changes only the performing hand
- **THEN** the displayed finger is retained without being labeled a newly entered personal finger
- **AND** matching scopes are updated from effective hand authority without losing other field choices

### Requirement: Immediate open-score reuse and load-time library reuse
Shared edits SHALL update eligible matches in the open score without waiting for whole-library writes. Other scores SHALL resolve current shared knowledge on load. Notation, practice and explicit calculation SHALL consume consistent effective assignments, while existing attainment and historical evidence remain intact.

#### Scenario: Edit here and open another score later
- **WHEN** a shared finger changes in the open score
- **THEN** its eligible open-score matches update and unopened score files need not be rewritten
- **AND** loading another matching score uses the latest shared value while preserving its local exceptions and practice progress

#### Scenario: Stale prepared view
- **WHEN** a shared revision changes after a view or practice context was prepared
- **THEN** stale effective assignments are not presented as current
- **AND** rebuilding the effective view does not reset attainment or rewrite historical claims

### Requirement: Source inspection and explicit reference promotion
The editor SHALL identify whether the selected choice is shared or local and expose its reference and contributing provenance. A source command SHALL visit the reference and return to the departure context when invoked again. An explicit make-reference action SHALL publish the current occurrence's personal choices and transfer the reference without erasing other local exceptions.

#### Scenario: Compare the source in context
- **WHEN** the player invokes the source command on a copied choice and invokes it again at the source
- **THEN** the first invocation visits the corresponding source location and the second restores the departure score, selection, view and edit navigation mode
- **AND** edits made during the visit are retained

#### Scenario: Make a variation the reference
- **WHEN** the player explicitly makes a locally modified occurrence the reference
- **THEN** its published choices become the shared values and source navigation points to this occurrence
- **AND** inherited matches update while independent local exceptions remain intact

### Requirement: Deterministic reference succession
Initial shared choices SHALL use the earliest available recorded personal authorship with deterministic ties. Deleting the reference score SHALL preserve shared values and field provenance, with the next-oldest matching survivor taking over. Inherited-only survivors SHALL have stable age ordering. Missing historical dates SHALL NOT be represented as known authorship.

#### Scenario: Delete the original score
- **WHEN** the reference score is deleted and matching survivors exist
- **THEN** the next-oldest occurrence becomes reference without changing shared values or silently publishing its local exceptions
- **AND** source links and provenance distinguish the current reference from original donors

#### Scenario: No surviving occurrence
- **WHEN** the last matching occurrence is removed
- **THEN** shared knowledge remains retained for a future matching score, and unavailable source navigation is explained

### Requirement: Ordinary historical import preserves authored differences
Existing identifiable personal choices SHALL become reusable without manual promotion. For conflicting historical choices outside an explicitly requested consolidation, the earliest recorded value SHALL seed shared knowledge and other existing differences SHALL remain local. Original records and uncertain field intent SHALL remain recoverable.

#### Scenario: Load order does not elect a different source
- **WHEN** the same historical library is indexed in a different order
- **THEN** reference election and effective choices are identical
- **AND** the player does not lose a saved difference because its score opened later

### Requirement: One-time consolidation of an explicitly selected existing piece
The requested consolidation SHALL unify saved fingers across exact whole-measure and hand matches within the selected piece, including conflicting legacy choices and saved fingers of uncertain authorship. Each field SHALL take its earliest recorded eligible value, with later contributions filling gaps. Copied results SHALL inherit that choice. Originals and a complete before/after provenance report SHALL be retained.

#### Scenario: Contradictory and sparse saved edits
- **WHEN** an earlier matching occurrence supplies finger 2, a later one supplies finger 3 for that note and finger 4 for a previously unanswered note
- **THEN** the consolidated shared result uses 2 for the conflict and 4 for the new information across eligible matches
- **AND** the replaced 3 and its old provenance remain recoverable
- **AND** historical undo buffers and calculated layers do not become additional donors

#### Scenario: Single-hand consolidation
- **WHEN** only one hand matches within the selected piece
- **THEN** consolidation reuses that hand's saved fingers without changing unrelated notes or the effective hand partition
- **AND** no other piece receives the special conflict-overwriting migration

#### Scenario: Whole patterns must not shield a hand conflict
- **WHEN** two independently repeated whole-measure patterns have different left-hand accompaniment but the same right-hand material and contradictory saved right-hand fingers
- **THEN** the one-time consolidation elects the earliest recorded value for each right-hand field across both patterns, with later contributions filling gaps
- **AND** populated whole-measure records do not shield a later contradictory right-hand choice
- **AND** a deliberate local or published whole-context exception made afterward retains normal protection

#### Scenario: Migration completion and later exception
- **WHEN** consolidation has completed and the player subsequently changes an inherited finger locally
- **THEN** restarting, reloading or retrying migration does not consolidate again or overwrite the new exception

### Requirement: Recoverable atomic memory changes
Memory and personal-state changes SHALL commit consistently against their expected prior revision, retain recoverable originals and reject stale writes. Consolidation SHALL record completion atomically with its effective state. It SHALL activate at an application-owned safe boundary without interrupting active practice or replacing a live journal externally.

#### Scenario: Concurrent or interrupted consolidation
- **WHEN** source data changes before consolidation commits, another writer advances the revision, or staging fails
- **THEN** stale output does not become active and the current valid personal state remains recoverable
- **AND** no successful completion is recorded for an incomplete transaction

#### Scenario: Recovery and preservation
- **WHEN** consolidation is rolled back through its recovery record
- **THEN** pre-consolidation choices can be restored, later choices remain recoverable, and score archives, practice progress and settings are preserved
