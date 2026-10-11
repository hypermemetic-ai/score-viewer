# Spec Delta

## REMOVED Requirements

### Requirement: Bounded joined-passage browsing
**Reason**: Recursive growing and nested joined ranges are replaced by originals, overlapping adjacent doubles and contrast exercises.
**Migration**: Retain historical joined claims in recoverable records; browse the new bounded catalog and restore selection only to an exactly available exercise.

## ADDED Requirements

### Requirement: Bounded exercise browsing
Passage selection SHALL browse original sections, independent adjacent doubles and contrast exercises without recursive growing joins. Existing column geometry, row spacing, right-aligned percentages and accessible source/component identity SHALL remain stable. Originals and doubles SHALL retain coherent source previews; contrasts SHALL identify both excerpt locations without implying the intervening source is played. Attainment SHALL remain independent.

#### Scenario: Selecting an adjacent double and its originals
- **WHEN** A–B and B–C are available
- **THEN** both have distinct accessible rows and exactly two original components
- **AND** Right enters the component list, Up/Down browses it and Left returns to the exercise list
- **AND** Enter starts the actual selected exercise or component without creating a larger join
- **AND** the first list entries remain aligned and reserved preview space does not shift

#### Scenario: Selecting a contrast exercise
- **WHEN** a player selects a contrast between distant sections
- **THEN** the selector identifies A and B by their genuine ranges and excerpt locations
- **AND** its preview does not join unrelated source measures into one continuous passage
- **AND** selection and active practice expose which alternative is current

#### Scenario: Keyboard navigation beyond a visible list edge
- **WHEN** Down selects the next row beyond the visible lower edge of either passage list
- **THEN** the previously selected edge row becomes the top row and the new selection appears directly beneath it, without animated scrolling
- **AND** further navigation uses the newly visible stretch without scrolling each selection by one row
- **AND** an equivalent Up transition retains the previous top row at the bottom, with the new selection above it

#### Scenario: Quiet overflowing selector lists
- **WHEN** either selector list overflows at an ordinary or narrow viewport
- **THEN** native scrollbars, tracks, arrows and scrollbar divider gutters remain visually hidden without adding a custom scroll control
- **AND** wheel/trackpad scrolling, keyboard navigation, contextual page snaps and accessible row focus remain available
- **AND** column widths, row alignment and component spacing remain stable without a separator between the lists

## MODIFIED Requirements

### Requirement: Quiet practice range context and progress summary
Practice strips SHALL omit individual measure numbers while retaining accessible source identities and explicit nonconsecutive boundaries. Selector and active header SHALL identify the selected exercise. Each row SHALL show its highest measured or manual-inclusive achieved speed relative to target, without a preparation bonus. Total SHALL equally weight all included catalog exercises, including locked exercises. Include manual SHALL remain checked by default and affect presentation only. Library/save totals SHALL use the same manual-inclusive catalog total.

#### Scenario: Original and independent connections
- **WHEN** originals A, B, C, pairs A–B, B–C and one contrast are included
- **THEN** each of those six exercises contributes one sixth of the Total weight regardless of length
- **AND** each row retains its own genuine achieved-speed percentage without borrowing similar-section or component evidence
- **AND** locked exercises remain in the denominator before unlocking

#### Scenario: Select and practise measures 1–4
- **WHEN** the user selects and starts a catalog section covering measures 1–4
- **THEN** the selector and active header identify its range once outside unnumbered practice notation
- **AND** full-score notation keeps its original numbering

#### Scenario: Different section and joined-run attainment
- **WHEN** original and adjacent-double attainment differ, or a historical whole-piece run is retained
- **THEN** current exercise rows retain their own correct achieved-speed percentages without borrowing component or long-run evidence
- **AND** Total summarizes the included bounded catalog without rewriting historical attainment

#### Scenario: Mixed completion with manual results included
- **WHEN** some included exercises are completed and others are in progress with Include manual checked
- **THEN** ordinary completed entries appear above the divider and unfinished entries sort by decreasing own progress then chronological source order
- **AND** each row shows one percentage, with a manual rate at 25% of target displaying 25% without a preparation bonus
- **AND** excluded rows retain their anchored positions and remain visibly excluded

#### Scenario: Display measured results only
- **WHEN** the player unchecks Include manual
- **THEN** rows, selected detail, active header and Total use measured results only while retaining selection and checkbox focus
- **AND** manual marks, measured records and historical joins remain intact, with no change to completion eligibility or automatic progression
- **AND** toggling or using the checkbox's native keys neither starts practice nor persists evidence changes

#### Scenario: Manual display criterion and sorting
- **WHEN** Include manual is checked
- **THEN** ordinary completed/unfinished grouping and sorting use manual-inclusive achieved-speed progress without a preparation contribution
- **WHEN** the player unchecks it
- **THEN** rows, selected detail, active header and Total use measured results only while retaining selection and checkbox focus
- **AND** manual marks, raw measured records and history remain intact; this display choice does not change completion eligibility or persist evidence changes

#### Scenario: Exclude and restore
- **WHEN** one exercise is excluded
- **THEN** its contribution and one unit of denominator weight are removed together
- **AND** the player receives no earned attainment for that decision
- **WHEN** it is restored
- **THEN** its existing attainment contributes again without needing to be recreated

#### Scenario: No included exercises
- **WHEN** every exercise is excluded
- **THEN** Total identifies that no exercises are included rather than claiming earned 100% completion

#### Scenario: Consistent library and saved progress totals
- **WHEN** the library loads practice evidence or a practice save reports progress
- **THEN** the summary uses the same equally weighted included catalog and manual-inclusive achieved-speed criterion
- **AND** legacy whole-piece claims are not relabeled as completion of adjacent pairs or of the new catalog
- **AND** full-score numbering, genuine attainment provenance, settings and source bytes remain intact

## ADDED Requirements

### Requirement: Tasteful reversible selector exclusion
Every exercise row SHALL support an accessible mouse and keyboard exclusion toggle. An excluded row SHALL remain in its existing list position, readable and selectable, with restrained canceled-out styling and an explicit accessible Excluded state. Toggling SHALL neither start practice nor masquerade as Done. Keyboard hints SHALL use undecorated shared kbd styling.

#### Scenario: Toggle a hovered or keyboard-selected row
- **WHEN** a player uses the row toggle or an admitted exclusion shortcut on the hovered or keyboard-selected exercise
- **THEN** only that row changes inclusion state and remains at its position
- **AND** muted styling and a fine cancellation line on its range identify the exclusion without obscuring percentage, focus or keyboard hints
- **AND** restoring uses the same action without discarding progress

#### Scenario: Guarded keyboard input
- **WHEN** a text editor, numeric edit, modal, control capture or saved authoritative binding owns the proposed shortcut
- **THEN** exclusion does not steal that input
- **AND** the mouse control remains available and its accessible name describes the current Include or Exclude action

## MODIFIED Requirements

### Requirement: Continuous consecutive notation
Consecutive measures within each selector preview row or active practice strip SHALL form continuous horizontal notation with aligned staff lines and source-correct barlines. Explicit preview row breaks SHALL retain genuine consecutive source ranges; they SHALL NOT change the exercise or active reading order. Independent crop gaps, duplicated authored boundary ink, and horizontal scrollbars SHALL be absent. The live reading surface SHALL also keep continuous staff through spatial refills; musical notation and separators SHALL retain their source meaning.

#### Scenario: Four bars across a source system or page boundary
- **WHEN** the user selects or practises four consecutive source measures whose prepared pages span different systems or pages
- **THEN** all four measures read as one aligned strip, including the system/page junction, with each internal separator painted once
- **AND** note ink, existing repeat/final marks, other authored boundary ink, and cross-measure relations retain their musical meaning

#### Scenario: Ordinary outer edge of a four-measure strip
- **WHEN** the fourth displayed measure ends at an ordinary boundary
- **THEN** the strip's outer right edge remains open without an unnecessary closing barline
- **AND** an existing source repeat or final boundary remains visible when present at that edge

#### Scenario: Consecutive measures include a rest-only bar
- **WHEN** a displayed passage includes a measure with no note seats
- **THEN** the real source measure and its staff, rests, and boundaries remain part of the continuous passage

### Requirement: Efficient leaf selection preview
A selected original leaf SHALL display all its source measures using available preview space efficiently. A very long sparse original exceeding the safe single-strip limit SHALL use bounded source-faithful rows with owned vertical scrolling and a common scale. An ordinary four-bar leaf SHALL show all four bars without a horizontal scrollbar or an automatic two-row fragment layout. Fitting SHALL account for complete visible musical ink and a substantial consistent left inset so the notation does not crowd the preview edge.

#### Scenario: Selecting an original four-bar component
- **WHEN** the user selects a four-bar leaf, including through a joined passage's component list
- **THEN** its four source bars appear together with useful horizontal scale and complete duration/annotation ink
- **AND** the first notation has clear breathing room from the preview's left edge, including after rotation or resize
- **AND** changing the preview does not change component or joined-run attainment

#### Scenario: Very long sparse original preview
- **WHEN** a valid sparse original spans more than 64 source bars
- **THEN** the selector displays its complete source span in rows of at most four bars with owned vertical scrolling and a common readable scale
- **AND** row boundaries retain source identity, complete duration and annotation ink, and genuine held or tied tails
- **AND** no unbounded source-rendering request or exercise split is introduced
- **AND** ordinary four-bar previews retain their continuous single-strip presentation
