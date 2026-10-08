# Practice passage display

## Purpose

Present source-faithful practice notation as coherent consecutive passages, with stable reading positions and complete note-ink visibility, so pianists can select and practise passages without fragmented notation.

## ADDED Requirements

### Requirement: Continuous consecutive notation
Consecutive measures displayed in passage selection or active practice SHALL form one continuous horizontal strip with aligned staff lines and source-correct barlines. Independent crop gaps, duplicated authored boundary ink, and horizontal scrollbars SHALL be absent. Musical notation and separators SHALL retain their source meaning.

#### Scenario: Four bars across a source system or page boundary
- **WHEN** the user selects or practises four consecutive source measures whose prepared pages span different systems or pages
- **THEN** all four measures read as one aligned strip, including the system/page junction, with each authored separator painted once
- **AND** note ink, repeats, double/final barlines, and cross-measure relations retain their musical meaning

#### Scenario: Consecutive measures include a rest-only bar
- **WHEN** a displayed passage includes a measure with no note seats
- **THEN** the real source measure and its staff, rests, and boundaries remain part of the continuous passage

### Requirement: Stable active reading references
Active practice SHALL retain the existing fixed reading positions and completion/hold conditions for replacing measures. Replacing a completed position SHALL leave surviving measures at the same coordinates and scale within an unchanged viewport. Music SHALL NOT slide continuously. Nonconsecutive positions SHALL NOT be presented as consecutive musical boundaries.

#### Scenario: Protected and eligible source positions
- **WHEN** measured practice completes a measure and all its displayed hold obligations expire
- **THEN** the next source measure can replace the eligible fixed position without moving surviving notation
- **AND** an unmatched attack, active hold, error, or unmeasured run cannot trigger that automatic replacement

#### Scenario: A joined run wraps through fixed positions
- **WHEN** replacement temporarily displays source measures in an order such as 5, 2, 3, 4
- **THEN** the existing reading order and measure labels remain clear
- **AND** consecutive measures 2, 3, 4 have coherent notation without implying that measure 5 immediately precedes measure 2 in the source

### Requirement: Efficient leaf selection preview
A selected original leaf SHALL display all its source measures together as one horizontal strip using available preview space efficiently. An ordinary four-bar leaf SHALL show all four bars without a horizontal scrollbar or an automatic two-row fragment layout. Fitting SHALL account for complete visible musical ink.

#### Scenario: Selecting an original four-bar component
- **WHEN** the user selects a four-bar leaf, including through a joined passage's component list
- **THEN** its four source bars appear together with useful horizontal scale and complete duration/annotation ink
- **AND** changing the preview does not change component or joined-run attainment

### Requirement: Bounded joined-passage browsing
Completed adjacent groups SHALL retain their compact joined range and accessible list of original components. Large joined selections SHALL retain bounded passage browsing; the system SHALL NOT compress an entire multi-page work into an unreadable selection image. Component and joined-run attainment SHALL remain independent.

#### Scenario: Selecting a large joined range and its component
- **WHEN** completed adjacent components form a multi-page joined passage
- **THEN** one compact joined range and its original component side list remain available
- **AND** selecting the joined range does not shrink the whole work into a tiny preview, while selecting a component displays that component's leaf strip

### Requirement: Complete note-ink ownership
All ink owned by a note SHALL participate in that note's existing visibility lifecycle, including ordinary and hollow duration stems, white reservations, noteheads, flags, dots, and owned relation fragments. Hidden notes SHALL leave no owned residual ink. Shared ink required by another visible owner and unrelated notes or staff SHALL be preserved. This behavior SHALL apply generically to supported scores.

#### Scenario: A long-duration note becomes hidden
- **WHEN** practice hides the owner group containing a note with a hollow half- or whole-duration stem
- **THEN** the hollow outline and white interior disappear with the associated note ink
- **AND** other visible notes and structural staff ink remain intact

#### Scenario: Shared duration and relation ink
- **WHEN** a displayed beam or relation fragment has multiple source owners and some remain visible
- **THEN** ink required by those visible owners remains correct without orphaned duration ink from hidden owners

### Requirement: Full-window Pause restoration
Pausing a running passage SHALL restore the complete source notation in the displayed passage window, including every note-owned duration mark and white reservation. Restoration SHALL follow the same ownership model as removal and SHALL NOT depend on reconstructing a score-specific exception.

#### Scenario: Pause after ordinary and hollow notes were removed
- **WHEN** the user pauses active practice after ordinary and hollow-stem note groups have disappeared
- **THEN** the displayed window restores their complete source notation at its reading positions
- **AND** repeated start, removal, and Pause cycles retain correct ownership and geometry

### Requirement: Preserve practice modes and musical interaction
The display repair SHALL preserve the existing measured/unmeasured distinction, beat-aligned count-in/repeat and speed transitions, first-loop eligibility, reversible Done completion, and queued speed changes. Unmeasured practice SHALL retain readable source music without fabricating observed attacks or measured attainment. Existing paused/unmeasured passage-window controls SHALL remain usable.

#### Scenario: Unmeasured loop and manual window change
- **WHEN** a user practises without MIDI and turns a passage window
- **THEN** the source music remains readable and the running clock, tempo, completion eligibility, and retained evidence continue under their existing rules
- **AND** no fabricated matched attack causes note removal or automatic position replacement

#### Scenario: Done or queued speed during repeat
- **WHEN** the user toggles eligible Done through Enter or an assigned pedal, or queues a speed change
- **THEN** the same reversible completion target and musical beat-aligned transition apply as before the display repair

### Requirement: Supported presentation and shared control compatibility
The passage display and note-ink lifecycle SHALL work in both Conventional piano and Jankó four-row presentations when supplied by the score package. Shared display rotation and input bindings SHALL continue across the relevant interfaces. Layout changes SHALL NOT restart the practice loop or reinterpret its musical state.

#### Scenario: Presentation and rotation checks
- **WHEN** a supported score is inspected in each available keyboard presentation and the shared display is rotated or resized
- **THEN** both affected practice views retain continuous, complete notation and appropriate note ownership
- **AND** input bindings and the active loop's musical state remain consistent

### Requirement: Frozen source and saved-state preservation
Practice presentation repair SHALL preserve prepared score bytes, source/keyboard identities, finger corrections, library, calibration, settings, and practice/attainment/history data. Unsupported source geometry or unresolved ink ownership SHALL be reported explicitly rather than silently inventing musical content or claiming successful rendering.

#### Scenario: Viewing a retained prepared score
- **WHEN** an existing prepared package is opened for selection or practice
- **THEN** its stored pages, recipe authority, source identity, and saved-state bindings remain unchanged
- **AND** a rendering admission failure retains that package and saved data while identifying the unsupported passage
