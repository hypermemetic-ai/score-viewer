# score-transposition Specification

## Purpose
Let pianists transpose an opened score for reading and practice while retaining trustworthy notation, correct pitch assessment and all original edition data.

## Requirements

### Requirement: Discoverable per-score steps control
An opened score SHALL expose Transpose in the visible Score section of Options. Its numeric value SHALL use the unit steps: positive raises pitch, negative lowers pitch, and 0 selects the exact untransposed edition. The control SHALL use the established centered numeric field, stacked mouse chevrons and keyboard browse/edit behavior.

#### Scenario: Edit transposition from reader Options
- **WHEN** the user opens a score, presses the configured Options binding and navigates to Transpose
- **THEN** the value and steps unit are visible without expanding a Score disclosure
- **AND** Enter starts editing, typing or edit-mode Up/Down changes the draft by whole steps, Enter commits, and Escape cancels the draft
- **AND** browse-mode arrows navigate options without changing pitch or selecting the mouse chevrons

#### Scenario: Concise transposition row
- **WHEN** Transpose is shown
- **THEN** the row contains its label, numeric value, steps unit and mouse chevrons without explanatory commentary
- **AND** a concise validation error appears only when needed

### Requirement: Complete musical pitch transformation
An admitted transposition SHALL shift all sounding pitch references by the same integer offset, with each step moving one adjacent chromatic pitch, while preserving musical timing, source owner/bar identities, hand assignments, repeats, grace timing and relation meaning. Legal offsets SHALL respect the supported instrument range. Unsupported pitch-bearing structures SHALL refuse explicitly; pitches SHALL NOT wrap, clip or fold octaves.

#### Scenario: Notes, repeat overrides, ties and pitched grace notes
- **WHEN** a supported source is transposed upward or downward
- **THEN** ordinary notes, repeated-occurrence pitch overrides, repeat-tie pitch references, pitched grace members and pitch-bearing owner guards agree on the offset
- **AND** durations, attacks, silence, repeat traversal and tie/slur identities retain their musical meaning

#### Scenario: Pitch outside the supported range or unsupported structure
- **WHEN** the requested offset cannot transform the complete source safely
- **THEN** admission refuses with a concise explanation and the prior score remains usable
- **AND** the control does not persist an invalid or partially applied value

### Requirement: Fresh pages and complete notation
Each genuinely new transposed presentation SHALL use the existing shared engraving authority to engrave complete pages and seats for its actual pitches, from the score's own hands. Nothing SHALL be calculated: no fingering or hand is chosen by a calculator. The earlier edition's printed finger layer SHALL NOT be carried, because those fingerings belong to its pitches. Matching prior hand assignments SHALL NOT permit reuse of old pitch ink. Both supported keyboard presentations SHALL retain the selected edition's owner hand map and complete geometry admission.

#### Scenario: Transpose without changing any hand assignments
- **WHEN** the new pitches retain all existing owner hands
- **THEN** pages and seats are freshly rendered for those pitches
- **AND** full-score pages and four-measure previews show coherent notation, including ties, slurs and duration ink

#### Scenario: Conventional and Jankó presentation
- **WHEN** the same selected score transposition is opened with either supported keyboard
- **THEN** that presentation uses its actual physical pitches and its own valid complete layer
- **AND** conventional contact/cache choices are not shifted mechanically from another pitch or presentation

### Requirement: Independently admitted transformation authority
A transposed archive SHALL retain its exact admitted untransposed baseline and bind original identity, offset, versioned transformation policy, guarded complete selected hand map and effective musical identity. Worker output, receiving-realm checks and cold import SHALL independently reconstruct and admit the effective source. Historical archives SHALL retain their literal source and recipe meaning.

#### Scenario: Cold open or share a transposed score
- **WHEN** a saved or shared transposed archive is opened without the generating worker's memory
- **THEN** the reader reconstructs the effective pitches from the retained original and admitted offset before admitting its pages, seats and layer
- **AND** the archive retains the information required to repeat that admission offline

#### Scenario: Tampered or stale transposition output
- **WHEN** original bytes, steps, effective source, layout, owner guards, pages, seats or layer bindings differ from the exact requested transformation
- **THEN** output refuses independently of any worker claim or prior host certificate
- **AND** historical policy dispatch and existing font/geometry checks remain intact

#### Scenario: Selected hand map differs from immutable source
- **WHEN** transposition retains a currently admitted selected hand map
- **THEN** receiving admission verifies it equals the selected requested edition and its complete guards normalize to original owner identities/pitches/timing
- **AND** cold admission treats it as explicit Viewer selection authority while enforcing authored/editorial hand requirements
- **AND** the retained baseline is exactly one untransposed archive, without nested transformation envelopes

### Requirement: Atomic reversible score selection
The selected offset SHALL persist for the original score and apply consistently in reading, practice and keyboard presentation selection. Activation SHALL occur only after complete admission and durable additive installation. Failure, cancellation or supersession SHALL preserve the currently selected edition and offset. Selecting 0 SHALL restore the retained untransposed edition rather than regenerate it.

#### Scenario: Return to the original score
- **WHEN** the user selects 0 after practising a transposed edition
- **THEN** the exact retained untransposed archive, applicable original corrections and original achievement history become active again
- **AND** the transposed edition and its data remain retained

#### Scenario: Share restoration and retained offset compatibility
- **WHEN** a shared derived archive is imported or an existing offset is selected again
- **THEN** the exact admitted retained baseline permits 0 restoration on the receiving computer
- **AND** cached offset editions are reused only when baseline, selected per-layout hand map and hand-policy context match the current request

#### Scenario: First add another keyboard while transposed
- **WHEN** the original archive lacks the newly selected keyboard presentation
- **THEN** ordinary keyboard preparation retains an admitted untransposed companion for that new layout before activating its transposed view
- **AND** the original existing keyboard archives, pages and journals remain exact, and neither the intermediate companion nor a different keyboard activates as a side effect
- **AND** later selecting 0 uses the retained untransposed edition for the requested keyboard without regenerating an existing original view

#### Scenario: Failure or newer request during generation
- **WHEN** generation fails, is cancelled, or is superseded by another score/offset request
- **THEN** it cannot activate stale output, overwrite original journals, or leave the visible value disagreeing with the selected score

### Requirement: Pitch-specific personal and achievement evidence
Transposed editions SHALL preserve the original archives, corrections and achievement journals without treating original pitch/contact guards or achieved playing as evidence for new pitches. The player's own hand and finger choices SHALL move with their notes: each note keeps its identity and timing, and its guard pitch moves by the transposition steps. A choice that cannot move stays with the earlier edition. Corrections and measured/manual achievement for a transposed edition SHALL remain correctly bound to that edition. Returning to a retained edition SHALL recover its own saved evidence.

#### Scenario: Original edited score is transposed
- **WHEN** the original contains personal corrections and practice progress
- **THEN** those originals remain unchanged and recoverable
- **AND** a newly transposed edition carries the player's own hand and finger choices to the moved notes, with no calculated fingerings and no falsely inherited achievement claim
- **AND** non-achievement practice preferences remain available without copying played progress or completion

### Requirement: Reading and assessment use one effective pitch context
Displayed notation, practice obligations and performance assessment SHALL use the same admitted effective pitches. Changing transposition SHALL stop transient playback/assessment and rebuild the relevant view before resumption, preserving the selected passage where its owner/bar identities remain applicable. Live piano passthrough SHALL continue sounding the physical incoming MIDI pitches.

#### Scenario: Transpose from practice Options to a new pitch edition
- **WHEN** a paused practice user commits a valid offset to a new pitch edition
- **THEN** the passage range remains selected with newly admitted notation and expected pitches, and resumed assessment uses the new pitch context
- **AND** pending events from the prior pitch context cannot advance or complete the new one

#### Scenario: Retained edition has a crossing joined range
- **WHEN** the retained edition's admitted grouping cannot also represent the previously selected joined passage
- **THEN** its saved grouping, preferences and evidence take priority over the incoming navigation context
- **AND** the selector explicitly reports that the prior passage is unavailable rather than failing after activation or silently practicing another range
- **AND** practice state and grouping admission complete before the library pointer changes

#### Scenario: Original reference MIDI attachment
- **WHEN** an archive contains reference MIDI and is transposed
- **THEN** its original reference bytes remain intact and are identified as original-source reference where exposed
- **AND** the app does not imply transposed reference playback, which is outside the current reference attachment behavior
