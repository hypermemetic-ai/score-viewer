## ADDED Requirements

### Requirement: Stable short-passage practice framing
Selected passages of at most four measures SHALL retain one complete-source stationary fit across Ready, MIDI/manual Start, count-in and playing within an unchanged viewport. Connection status or preparation state SHALL NOT reduce notation size or move its source reading references. Source-owned note retirement and held cues SHALL preserve structural staff and real measure frames; Free view SHALL restore all owned ink.

#### Scenario: Start with a piano connected
- **WHEN** a four-bar passage enters measured count-in and then trial from Ready
- **THEN** its source note positions, common scale and staff frame remain identical to the established Ready geometry
- **AND** disconnected Start uses the same framing, without accepting invented attacks

### Requirement: Current practice speed lattice
Fresh practice Starting speed SHALL be 10% of the performance target. Current starting/working/increase controls SHALL admit half-percentage-point units, including typed, held, restored and automatic changes. The truthful native lower tempo limit MAY impose the nearest legal lattice floor. Raw attainment and history SHALL remain exact. An attempt SHALL capture its rate; live requested changes SHALL apply at the next musical boundary without changing its clock or crediting an unplayed rate.

#### Scenario: Fresh target and queued working speed
- **WHEN** a fresh passage has target 360/min and the user presses Up while playing
- **THEN** it starts at 36/min (10%) and requests 10.5% for the next attempt
- **AND** the current attempt remains at 10% through completion and records that actual rate

### Requirement: Editable source-meter repeat cue
Practice SHALL default to two count-in bars of the entry source meter, configurable from one to eight in Options. Startup, resume and every repeat SHALL supply a consistent audible metric hierarchy aligned to the overarching source beat structure and exact entry phase. Strict musical grid V3 SHALL bind the chosen bars and source phase; historical V2 replay SHALL remain literal and unrelated Performance policy SHALL remain unchanged.

#### Scenario: Compound-meter entry and repeat
- **WHEN** a 6/8 passage starts or repeats at 10% working speed
- **THEN** two complete 6/8 count-in bars clearly cue their two principal beats and subordinate subdivisions
- **AND** source entry and subsequent repeats retain exact phase and queued-rate alignment

### Requirement: Visible editable resume cooldown
Practice error recovery SHALL guard resume for an Options-configured cooldown of zero to thirty seconds, default three. While guarded, a subtle centered lock silhouette SHALL show remaining seconds, then disappear at expiry. Close, changed attempt and cancellation SHALL clear obsolete timers without delayed musical activation.

#### Scenario: Error recovery
- **WHEN** a default practice attempt fails and the user presses Resume before three seconds elapse
- **THEN** playback remains stopped and the visible lock explains the remaining wait
- **AND** resume becomes available at expiry without starting automatically

### Requirement: End-to-end practice keyboard operation
Keyboard operation SHALL be a delivery requirement throughout passage selection, active practice, Options, numeric draft editing, Free view and return. Plain active Up/Down SHALL adjust Working speed in 0.5% units when no authoritative binding, field, modal or capture owns them. Options browsing SHALL navigate rows without changing values; Enter activates editing, edit Up/Down adjusts values, and Escape cancels the draft before closing. Mouse chevrons SHALL add no keyboard stops. Saved controls, modifiers, repeated keys and capture SHALL retain coherent ownership; applicable Free view navigation, Space Resume, disconnected Done and Back SHALL remain usable.

#### Scenario: Complete keyboard practice flow
- **WHEN** the user selects a passage, starts, changes working speed, opens Options, edits and cancels a number, enters Free view, browses and resumes using only keys
- **THEN** each step acts on the visibly focused or active context without silently consuming an actionable key or triggering another context's action
- **AND** custom bindings, disconnected Done and Back retain their admitted behavior

### Requirement: Exact repeated musical completion equivalence
Passages with exact source musical equivalence SHALL resolve the same measured/manual attainment without rewriting raw evidence. Repeated identical child classes, including A+A, SHALL share A's completion class; heterogeneous ordered sequences SHALL retain independent completion. Equivalence SHALL include genuine performing roles, pitches, written timing, ties, rests, meter/phase and performance reference. Include manual SHALL filter provenance, and manual undo from an equivalent passage SHALL reverse the applicable shared manual claim without deleting measured or other-rate evidence.

#### Scenario: Identical Schumann components and repetitive parent
- **WHEN** a completed component reappears with exactly the same musical structure, or an otherwise identical parent consists only of repetitions of that class
- **THEN** its displayed completion resolves from the same existing evidence
- **AND** a differing rhythm, hand, reference or heterogeneous component order cannot borrow that completion

## MODIFIED Requirements

### Requirement: Bounded joined-passage browsing
Completed adjacent groups SHALL retain their compact joined range and accessible list of original components. At an unchanged viewport, passage ranges, original groups and selected-group previews SHALL occupy three stable columns with compact lists and reserved middle space. Both lists SHALL anchor percentages to the right and reserve enough width for the full score's measure-number digits, including three-digit ranges, without wrapping or overlapping their percentages. Large joined selections SHALL retain component browsing; the system SHALL NOT compress an entire multi-page work into an unreadable selection image. Component and joined-run attainment SHALL remain independent unless they resolve to the exact same source-owned musical equivalence class, including repeated identical child classes. Heterogeneous runs SHALL NOT borrow component evidence.

#### Scenario: Selecting a large joined range and its component
- **WHEN** completed adjacent components form a multi-page joined passage
- **THEN** one compact joined range and its original component side list remain available
- **AND** selecting the joined range populates the reserved middle group list without narrowing or shifting the preview pane, while selecting a component displays that component's complete original leaf strip
- **AND** Right enters the group list, Up/Down browses its components, and Left returns to the joined range list
- **AND** Enter starts the selected parent or component, and browsing does not change stored attainment
- **AND** the first range and group entries align vertically and the preview area has no white placeholder until a leaf is selected

#### Scenario: Recommended nested range and long component list
- **WHEN** automatic progression recommends a retained nested joined range within a larger frontier
- **THEN** that exact selected range has a transient visible left-column row, its whole-range action and original middle-column groups
- **AND** focus and Enter do not silently target a different passage or an invisible component
- **WHEN** the user navigates to a late original group in a long list
- **THEN** that group remains visible within the bounded list and its preview stays available in the right pane

#### Scenario: Keyboard navigation beyond a visible list edge
- **WHEN** Down selects the next row beyond the visible lower edge of either passage list
- **THEN** the previously selected edge row becomes the top row and the new selection appears directly beneath it, without animated scrolling
- **AND** further navigation uses the newly visible stretch without scrolling each selection by one row
- **AND** an equivalent Up transition retains the previous top row at the bottom, with the new selection above it

#### Scenario: Quiet overflowing selector lists
- **WHEN** either selector list overflows at an ordinary or narrow viewport
- **THEN** native scrollbars, tracks, arrows and scrollbar divider gutters SHALL remain visually hidden without adding a custom scroll control
- **AND** wheel/trackpad scrolling, keyboard navigation, contextual page snaps and accessible row focus remain available
- **AND** column widths, row alignment and component spacing remain stable without a separator between the lists

### Requirement: Quiet practice range context and progress summary
Practice strips SHALL omit visible individual measure numbers while retaining accessible source identities and explicit nonconsecutive boundaries. Passage selection and the active session header SHALL identify the selected range outside the notation. The selector SHALL show one overall achieved-speed figure under the Total progress heading and an Include manual checkbox checked by default. Each passage SHALL show one percentage using its highest measured rate, or its highest measured/manual rate when the checkbox is checked, relative to the current target without a preparation bonus. The chosen display criterion SHALL apply to rows, selected detail, active header, completed/unfinished grouping and sorting, and the overall summary weighted over original leaves once. Library summaries and progress reported after a practice save SHALL use the same default manual-inclusive weighted-leaf total without a preparation bonus. Component and joined-run rates SHALL remain independent unless they resolve to the exact same source-owned musical equivalence class, including repeated identical child classes. Heterogeneous runs SHALL NOT borrow component evidence. Full-score measure numbering, saved evidence/hierarchy, Done eligibility, automatic suggestions and musical advancement SHALL remain unchanged.

#### Scenario: Select and practise measures 1–4
- **WHEN** the user selects and starts a passage covering measures 1–4
- **THEN** the selector and active header identify that range once outside their unnumbered practice notation
- **AND** full-score notation keeps its original numbering

#### Scenario: Different section and joined-run attainment
- **WHEN** component progress differs from a larger joined or whole-piece run
- **THEN** each heterogeneous passage row retains its own correct achieved-speed percentage without borrowing component or joined-run evidence
- **AND** one Total progress summary replaces the confusing paired Sections learned and Whole piece summary without recalculating stored attainment

#### Scenario: Mixed completion with manual results included
- **WHEN** some groups are completed and others are still in progress
- **THEN** completed/connected groups appear above a divider and unfinished groups sort by decreasing own progress then chronological score order
- **AND** each row displays a single percentage rather than separate Best or Done figures
- **AND** a manual rate at 25% of target displays 25% without a preparation contribution

#### Scenario: Display measured results only
- **WHEN** the user unchecks Include manual
- **THEN** displayed rates, grouping and sorting use measured results only while retaining the selected passage and checkbox focus
- **AND** manual marks, measured records and saved joins remain intact, and automatic suggestions, musical advancement and Done eligibility do not change
- **AND** toggling the checkbox or pressing its native keys does not start a passage or persist practice evidence changes

#### Scenario: Consistent library and saved progress totals
- **WHEN** the library loads saved practice evidence or a practice save reports its progress
- **THEN** the total uses the highest measured or manual rate for each original leaf relative to the current target, weighted once without a preparation bonus
- **AND** clearing Include manual changes the open practice display only; library and save totals remain manual-inclusive
- **AND** independent whole-run completion, measured/manual provenance, joins, preparation completion and history remain intact
