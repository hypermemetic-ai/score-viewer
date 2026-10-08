# Practice passage display

## Purpose

Present source-faithful practice notation as coherent consecutive passages, with stable reading positions and complete note-ink visibility, so pianists can select and practise passages without fragmented notation.

## ADDED Requirements

### Requirement: Continuous consecutive notation
Consecutive measures displayed in passage selection or active practice SHALL form one continuous horizontal strip with aligned staff lines and source-correct barlines. Independent crop gaps, duplicated authored boundary ink, and horizontal scrollbars SHALL be absent. Musical notation and separators SHALL retain their source meaning.

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

### Requirement: Passage-aware source relation geometry
Displayed ties and slurs SHALL be projected for the composed passage through shared curve rules and verified original source endpoints or continuation identities. A relation crossing an original system/page boundary or canonical active padding SHALL remain visibly connected through consecutive displayed measures. Distinct authored relations SHALL remain distinct. Complete relation paint and reservations SHALL participate in passage fitting and source-owner visibility without moving surviving note positions or rewriting prepared pages.

#### Scenario: One source slur split across original systems
- **WHEN** a selected consecutive passage contains fragments of the same authored slur from different original systems
- **THEN** the displayed slur forms one connected bow between its verified displayed endpoints
- **AND** original system-break tips and per-measure clips do not leave breaks or duplicate bows

#### Scenario: Fixed-position padding and separate source slurs
- **WHEN** active practice reserves canonical measure widths or displays distinct adjacent source slurs
- **THEN** each continuing relation follows its fixed displayed note endpoints across the padding
- **AND** separate source slurs and nonconsecutive slot wraps do not become an invented connection

### Requirement: Stable active reading references
Active practice SHALL retain the existing fixed reading positions and completion/hold conditions for replacing measures. Replacing a completed position SHALL leave surviving measures at the same coordinates and scale within an unchanged viewport. Music SHALL NOT slide continuously. Nonconsecutive positions SHALL NOT be presented as consecutive musical boundaries.

#### Scenario: Naturally centered active passage
- **WHEN** an active four-position track is fitted to the practice surface
- **THEN** the complete admitted notation is framed naturally with substantial outer breathing room and a clear left inset, accounting for unused SVG/slot space
- **AND** note removal and slot replacement do not recenter or shift surviving notation

#### Scenario: Protected and eligible source positions
- **WHEN** measured practice completes a measure and all its displayed hold obligations expire
- **THEN** the next source measure can replace the eligible fixed position without moving surviving notation
- **AND** an unmatched attack, active hold, error, or unmeasured run cannot trigger that automatic replacement

#### Scenario: A joined run wraps through fixed positions
- **WHEN** replacement temporarily displays source measures in an order such as 5, 2, 3, 4
- **THEN** the existing reading order and accessible source identities remain clear, with an explicit staff break at a nonconsecutive boundary
- **AND** consecutive measures 2, 3, 4 have coherent notation without implying that measure 5 immediately precedes measure 2 in the source

### Requirement: Efficient leaf selection preview
A selected original leaf SHALL display all its source measures together as one horizontal strip using available preview space efficiently. An ordinary four-bar leaf SHALL show all four bars without a horizontal scrollbar or an automatic two-row fragment layout. Fitting SHALL account for complete visible musical ink and a substantial consistent left inset so the notation does not crowd the preview edge.

#### Scenario: Selecting an original four-bar component
- **WHEN** the user selects a four-bar leaf, including through a joined passage's component list
- **THEN** its four source bars appear together with useful horizontal scale and complete duration/annotation ink
- **AND** the first notation has clear breathing room from the preview's left edge, including after rotation or resize
- **AND** changing the preview does not change component or joined-run attainment

### Requirement: Bounded joined-passage browsing
Completed adjacent groups SHALL retain their compact joined range and accessible list of original components. At an unchanged viewport, passage ranges, original groups and selected-group previews SHALL occupy three stable columns with compact lists and reserved middle space. Both lists SHALL anchor percentages to the right and reserve enough width for the full score's measure-number digits, including three-digit ranges, without wrapping or overlapping their percentages. Large joined selections SHALL retain component browsing; the system SHALL NOT compress an entire multi-page work into an unreadable selection image. Component and joined-run attainment SHALL remain independent.

#### Scenario: Selecting a large joined range and its component
- **WHEN** completed adjacent components form a multi-page joined passage
- **THEN** one compact joined range and its original component side list remain available
- **AND** selecting the joined range populates the reserved middle group list without narrowing or shifting the preview pane, while selecting a component displays that component's complete original leaf strip
- **AND** Right enters the group list, Up/Down browses its components, and Left returns to the joined range list
- **AND** Enter starts the selected parent or component, and browsing does not change independent attainment
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

### Requirement: Consistent practice range rows
Both selector lists and completed/unfinished sections SHALL use one roomier row rhythm, with text vertically centered within highlight and focus borders and aligned first-row baselines. Human measure ranges SHALL use consistently spaced dashes in the existing font without changing saved passage identities. Joined ranges SHALL retain accessible component identity without a redundant visible arrow.

#### Scenario: Mixed completion beside original groups
- **WHEN** completed joined ranges and unfinished leaf ranges appear beside original groups
- **THEN** both lists use the same row height, padding and text centering regardless of completion status
- **AND** each focused highlight encloses its centered row content, and three-digit ranges remain clear of right-aligned percentages

### Requirement: Quiet practice range context and progress summary
Practice strips SHALL omit visible individual measure numbers while retaining accessible source identities and explicit nonconsecutive boundaries. Passage selection and the active session header SHALL identify the selected range outside the notation. The selector SHALL show one overall achieved-speed figure under the short Progress heading and an Include manual checkbox checked by default. Each passage SHALL show one percentage using its highest measured rate, or its highest measured/manual rate when the checkbox is checked, relative to the current target without a preparation bonus. The chosen display criterion SHALL apply to rows, selected detail, active header, completed/unfinished grouping and sorting, and the overall summary weighted over original leaves once. Component and joined-run rates SHALL remain independent. Full-score measure numbering, saved evidence/hierarchy, library aggregates, Done eligibility, automatic suggestions and musical advancement SHALL remain unchanged.

#### Scenario: Select and practise measures 1–4
- **WHEN** the user selects and starts a passage covering measures 1–4
- **THEN** the selector and active header identify that range once outside their unnumbered practice notation
- **AND** full-score notation keeps its original numbering

#### Scenario: Different section and joined-run attainment
- **WHEN** component progress differs from a larger joined or whole-piece run
- **THEN** each passage row retains its own correct achieved-speed percentage without borrowing component or joined-run evidence
- **AND** one short Progress summary replaces the confusing paired Sections learned and Whole piece summary without recalculating stored attainment

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

### Requirement: Bottom return guide
The selector SHALL place its Score return action and Escape hint in the bottom controls, without a duplicate top-right Score control. Active practice SHALL identify its Escape return as Passages. Both actions SHALL remain accessible to mouse and keyboard, and musical status messages SHALL NOT replace the return guide. The selector SHALL group all four arrow hints under one Navigation label rather than separate Browse/Groups explanations. At ordinary widths, selector guidance and actions SHALL occupy one compact row; they MAY wrap when needed by a narrow viewport. Empty status SHALL NOT waste list height.

#### Scenario: Return from practice to the score
- **WHEN** the user presses Escape in active practice
- **THEN** the selector opens and the guide identifies Escape as the return to Score
- **WHEN** the user presses Escape in that selector
- **THEN** the full-score reader returns through the existing navigation path

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

### Requirement: Shared Options menu keyboard binding and name
Options SHALL have a configurable keyboard binding in the shared Keys and pedals interface, available from the full-score reader, passage selection and active practice. Its buttons, dialog title, binding entry, and accessible names SHALL use the same Options label. Configurable buttons SHALL show the current configured control. The default keyboard chord SHALL be O, with conflict-free admission for older preferences that preserves existing assignments and explicitly empty controls using the compatible persisted action identity. The library SHALL retain its Options entry.

#### Scenario: Opening Options from either practice interface
- **WHEN** the user presses the configured Options key in passage selection or active practice
- **THEN** the shared Options dialog opens with a Practice section first and the existing audio/MIDI, Keys and pedals, fingering display and applicable score controls below
- **AND** active practice follows the existing Pause behavior without changing completion eligibility, progress, or speed policy, and closing Options retains the passage and paused session

#### Scenario: Rebinding and guarded input
- **WHEN** the user changes the Options binding or activates it while a field, modal, or binding capture owns input
- **THEN** the binding entry and reader/practice buttons agree on its name and configured control
- **AND** existing focus, capture, held-key and repeat guards prevent unintended activation

#### Scenario: Older saved controls and the full-score reader
- **WHEN** preferences without the added persisted action are admitted, including preferences that already assign O
- **THEN** all original assignments remain unchanged and the new action receives an available default or fallback
- **AND** explicitly empty Options controls remain empty and a hardcoded reader O does not bypass the configured binding
- **AND** the library Options entry remains available

### Requirement: Clear selector and practice settings presentation
Selector rows SHALL retain achieved-speed percentages and genuine completion evidence while omitting redundant visible Not yet completed wording. Shared tempo controls SHALL place small up/down chevrons vertically inside the numeric box's right edge and reserve space for their focus borders without overlapping the entered value or neighboring controls. Numeric values SHALL be centered in slightly narrower boxes; the three Practice numeric boxes SHALL align in one column regardless of external unit length. `%` and the beat-unit marking SHALL remain outside the numeric box. Visible absolute per-minute units SHALL consistently use `/min`, with spelled-out accessible labels. Full-score Performance Tempo SHALL display a percentage above the absolute Score reference; Practice Performance target SHALL remain absolute. Performance percentage edits SHALL preserve exact selected rates and existing absolute admission, clock and record meaning. Mouse adjustment behavior and established field-specific increments SHALL remain available. Performance-target explanations SHALL agree with the displayed metronome marking and identify the reference for percentage controls; Performance helper text SHALL plainly describe the chosen tempo, note/timing checks and available fingerings without changing assessment. A fresh practice state's default increase per success SHALL be 1% of its performance target; retained saved increases and achievements SHALL remain unchanged.

#### Scenario: Uncompleted selector row and focused tempo decrement
- **WHEN** an uncompleted group is shown in the selector or a tempo decrement button receives focus
- **THEN** the row communicates progress without redundant incomplete-status wording
- **AND** the down chevron sits below the up chevron inside the numeric box's right edge, with its focus border in its own visible space without covering the entered value
- **AND** the percentage or metronome unit remains outside the numeric box

#### Scenario: Target marking and fresh increase
- **WHEN** a fresh practice state opens the Practice section in Options
- **THEN** its increase per success reads 1% and its performance target retains the metronome marking
- **AND** the explanation identifies that tempo as the reference for speed and increase percentages
- **AND** reopening a retained state preserves its saved exact increase and achievements

#### Scenario: Compact shared tempo units
- **WHEN** practice targets, absolute score references or shared metronome markings are displayed
- **THEN** the visible unit reads `/min` and assistive technology receives the equivalent spelled-out per-minute meaning
- **AND** the inline number retains its normal text baseline, the beat symbol sits slightly lower for balanced visual mass beside the number, and slash and min are separately spaced elements with air on both sides of the slash
- **AND** the beat duration and exact stored rate retain their existing musical meaning

#### Scenario: Performance tempo relative to score reference
- **WHEN** full-score Performance opens with the selected rate equal to a score reference of 180 notes per minute
- **THEN** Tempo reads 100% and Score reference below retains the absolute metronome marking at 180/min
- **AND** entering 50% selects 90 notes per minute while retaining the reference, absolute range admission and existing assessment rules
- **AND** untouched, committed-unchanged and cancelled percentage edits preserve an exact retained selected rate

### Requirement: Keyboard browse and edit modes for shared numeric tempo fields
Existing shared numeric tempo fields SHALL distinguish keyboard option navigation from value editing. Browse-mode Up/Down SHALL move among visible options without changing values or visiting the mouse spinner buttons. Enter SHALL start a numeric draft edit; edit-mode Up/Down SHALL apply the established field-specific increments and typing SHALL replace the value. Enter SHALL admit and commit a valid draft, and Escape SHALL cancel without persisting draft changes or altering queued speed/progression state. Spinner buttons SHALL retain accessible Increase/Decrease names but SHALL NOT become extra keyboard navigation stops. Direct input clicks SHALL permit editing. Native select/popup ownership, modifier/capture guards, existing range admission and musical shortcuts SHALL remain correct.

#### Scenario: Shared Options navigation and numeric edit ownership
- **WHEN** the Practice section is mounted in the shared Options dialog
- **THEN** one shared navigator owns browsing and pickers while numeric controls own only their edit activation and draft editing
- **AND** Tab and every directional navigation path omit the mouse chevrons, including after rotation and device-panel updates
- **AND** binding capture and test controls keep their existing key ownership

#### Scenario: Navigate and edit a practice setting
- **WHEN** the user navigates Starting speed, Increase per success and Performance target with Up/Down
- **THEN** focus changes settings without adjusting their values or selecting the small chevrons
- **WHEN** Enter starts editing the selected number
- **THEN** Up/Down adjusts that number and typing can replace it
- **AND** Enter commits the admitted value without activating Done or another dialog action

#### Scenario: Cancel an edited value
- **WHEN** the user changes a numeric draft and presses Escape
- **THEN** the original exact saved value and queued speed state remain unchanged
- **AND** Escape exits editing before it can close the dialog

#### Scenario: Invalid typed draft and shared mouse controls
- **WHEN** a typed draft cannot pass the field's existing admission rules
- **THEN** the field retains editing with its validation message and does not save an invalid value
- **AND** valid mouse chevron clicks/holds and release still use the existing adjustment rules
