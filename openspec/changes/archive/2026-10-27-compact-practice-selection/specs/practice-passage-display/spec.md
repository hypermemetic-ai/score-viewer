# Spec Delta

## MODIFIED Requirements

### Requirement: Consistent practice range rows
Both selector lists and completed/unfinished sections SHALL use one roomier row rhythm, with text vertically centered within highlight and focus borders and aligned first-row baselines. Human measure ranges SHALL use consistently spaced dashes in the existing font without changing saved passage identities. Completed group rows SHALL retain accessible component identity without a redundant visible arrow or a synthetic percentage.

#### Scenario: Mixed completion beside original groups
- **WHEN** completed group ranges and incomplete original ranges appear beside concrete exercise rows
- **THEN** both lists use the same row height, padding and text centering regardless of completion status
- **AND** each focused highlight encloses its centered row content, and three-digit ranges remain clear of right-aligned percentages

### Requirement: Quiet practice range context and progress summary
Practice strips SHALL omit individual measure numbers while retaining accessible source identities and explicit nonconsecutive boundaries. Selector and active header SHALL identify the selected exercise. Each concrete exercise row SHALL show its highest measured or manual-inclusive achieved speed relative to target, without a preparation bonus. Group rows SHALL have no percentage or assessment identity. Total SHALL equally weight all included catalog exercises, including locked exercises. Include manual SHALL remain checked by default and affect presentation only. Library/save totals SHALL use the same manual-inclusive catalog total.

#### Scenario: Original and independent connections
- **WHEN** originals A, B, C, pairs A–B, B–C and one contrast are included
- **THEN** each of those six exercises contributes one sixth of the Total weight regardless of length
- **AND** each concrete exercise row retains its own genuine achieved-speed percentage without borrowing similar-section or component evidence
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
- **THEN** maximal adjacent completed-original groups appear above incomplete originals on the left; incomplete originals sort by decreasing own progress then chronological source order
- **AND** each concrete exercise row shows one percentage while group rows show none, with a manual rate at 25% of target displaying 25% without a preparation bonus
- **AND** excluded rows retain their anchored positions and remain visibly excluded

#### Scenario: Display measured results only
- **WHEN** the player unchecks Include manual
- **THEN** rows, selected detail, active header and Total use measured results only while retaining selection and checkbox focus
- **AND** manual marks, measured records and historical joins remain intact, with no change to completion eligibility and no automatic change of active exercise
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

### Requirement: Preserve practice modes and musical interaction
The display repair SHALL preserve the existing measured/unmeasured distinction, beat-aligned count-in/repeat and speed transitions within the selected exercise, first-loop eligibility, reversible Done completion, and queued speed changes. Unmeasured practice SHALL retain readable source music without fabricating observed attacks or measured attainment. Existing paused/unmeasured passage-window controls SHALL remain usable.

#### Scenario: Unmeasured loop and manual window change
- **WHEN** a user practises without MIDI and turns a passage window
- **THEN** the source music remains readable and the running clock, tempo, completion eligibility, and retained evidence continue under their existing rules
- **AND** no fabricated matched attack causes note removal or automatic position replacement

#### Scenario: Done or queued speed during repeat
- **WHEN** the user toggles eligible Done through Enter or an assigned pedal, or queues a speed change
- **THEN** the same reversible completion target and musical beat-aligned repeat transition apply within the selected exercise, without selecting another exercise

### Requirement: Clear selector and practice settings presentation
Concrete selector exercise rows SHALL retain achieved-speed percentages and genuine completion evidence while omitting redundant visible Not yet completed wording. Completed group rows SHALL omit percentages. Category labels SHALL be concise and descriptive: Completed, Incomplete, Connections and existing Contrasts, without instructional suffixes or new learning terminology. Shared tempo controls SHALL place small up/down chevrons vertically inside the numeric box's right edge and reserve space for their focus borders without overlapping the entered value or neighboring controls. Numeric values SHALL be centered in slightly narrower boxes; the three Practice numeric boxes SHALL align in one column regardless of external unit length. `%` and the beat-unit marking SHALL remain outside the numeric box. Visible absolute per-minute units SHALL consistently use `/min`, with spelled-out accessible labels. Full-score Performance controls and execution SHALL be absent; historical records SHALL remain retained. Practice Performance target SHALL remain absolute, and retained practice tempo controls SHALL preserve their existing admission, clock and record meaning. Mouse adjustment behavior and established field-specific increments SHALL remain available. Performance-target explanations SHALL agree with the displayed metronome marking and identify the reference for percentage controls; No helper text SHALL offer full-score note/timing assessment outside section Reading/Timed. Fresh and retained practice increase values and achievements SHALL retain their current admitted behavior; removing full-score assessment SHALL NOT change speed settings.

#### Scenario: Uncompleted selector row and focused tempo decrement
- **WHEN** an incomplete exercise is shown in the selector or a tempo decrement button receives focus
- **THEN** the row communicates progress without redundant incomplete-status wording
- **AND** the down chevron sits below the up chevron inside the numeric box's right edge, with its focus border in its own visible space without covering the entered value
- **AND** the percentage or metronome unit remains outside the numeric box

#### Scenario: Target marking and fresh increase
- **WHEN** a fresh practice state opens the Practice section in Options
- **THEN** its increase per success retains the current application default and its performance target retains the metronome marking
- **AND** the explanation identifies that tempo as the reference for speed and increase percentages
- **AND** reopening a retained state preserves its saved exact increase and achievements

#### Scenario: Compact shared tempo units
- **WHEN** practice targets, absolute score references or shared metronome markings are displayed
- **THEN** the visible unit reads `/min` and assistive technology receives the equivalent spelled-out per-minute meaning
- **AND** the inline number retains its normal text baseline, the beat symbol sits slightly lower for balanced visual mass beside the number, and slash and min are separately spaced elements with air on both sides of the slash
- **AND** the beat duration and exact stored rate retain their existing musical meaning

#### Scenario: Performance tempo relative to score reference
- **WHEN** an existing saved score contains full-score Performance tempo or accuracy records
- **THEN** those historical records remain retained without exposing a full-score Performance start or grading control
- **AND** section practice keeps its genuine score reference, selected rates and numeric controls

### Requirement: Bounded exercise browsing
Passage selection SHALL browse original sections, independent adjacent doubles and contrast exercises through completed groups and incomplete originals, without recursive growing joins. Existing column geometry, row spacing, concrete-exercise right-aligned percentages and accessible source/component identity SHALL remain stable. Group rows SHALL open contents without being practice targets. Originals and doubles SHALL retain coherent source previews; contrasts SHALL identify both excerpt locations without implying the intervening source is played. Attainment SHALL remain independent.

#### Scenario: Selecting an adjacent double and its originals
- **WHEN** A–B and B–C are available
- **THEN** both remain distinct accessible exercises with exactly two original components, shown under their completed-original group when its constituents are completed
- **AND** Right or Enter on a group enters its contents without starting practice, Up/Down browses the active column and Left returns to the enclosing group
- **AND** Enter on an eligible concrete exercise starts that exercise, while a group never creates or starts a larger join
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

## ADDED Requirements

### Requirement: Compact completed groups and ordered contents
Each maximal consecutive run of completed original sections SHALL occupy one group row under Completed, with incomplete originals below under Incomplete. Group membership SHALL depend on displayed original completion, not connection completion. The selected group's right column SHALL show incomplete connections under Connections before completed sections and completed connections under Completed. Empty categories SHALL be omitted.

#### Scenario: Two completed runs
- **WHEN** original sections 1–4, 5–8 and 9–12 are completed with connections 1–8 and 5–12 still incomplete, 13–16 is incomplete, and 17–20 and 21–24 are completed
- **THEN** the Completed area contains exactly two group rows, 1–12 and 17–24, and Incomplete contains 13–16
- **AND** an uncompleted connection does not split either group or give its group a 0% label
- **AND** selecting 1–12 shows incomplete 1–8 and 5–12 connections first, followed by completed originals and any completed connections

#### Scenario: Groups do not acquire exercise behavior
- **WHEN** a completed group contains one or many original sections
- **THEN** its row is only a browsing target, with no Practice, Done, exclusion action or aggregate percentage
- **AND** its concrete children retain independent evidence and exclusion controls
- **AND** no exercise is added to Total and no larger practice span is created

#### Scenario: Incomplete original and remaining catalog access
- **WHEN** the player selects an incomplete original
- **THEN** its real preview and practice target remain available without duplicating the original as another right-column list row
- **AND** associated connections remain inspectable, with existing prerequisite feedback for locked pairs and normal eligibility for admitted manual evidence even when its display is filtered
- **AND** contrast exercises retain their existing Contrasts category and genuine excerpt identities

#### Scenario: Grouping changes without losing the selected exercise
- **WHEN** completion or Include manual causes a displayed group to merge or split
- **THEN** the selected concrete exercise and appropriate focus remain identifiable by their original source-bound identity
- **AND** no other exercise starts, no duplicate retained group is fabricated, and raw evidence and exclusions remain intact
