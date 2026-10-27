# Practice passage display Specification

## Purpose

Present source-faithful practice notation as coherent consecutive passages, with stable reading positions and complete note-ink visibility, so pianists can select and practise passages without fragmented notation.

## Requirements

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
During measured count-in or playing, the current measure SHALL retain its exact screen position and size within an unchanged viewport. Other whole measures SHALL change layout only in an atomic refill that draws incoming music. Original interiors and one common live scale SHALL remain unchanged. The reading surface SHALL remain continuous and naturally framed; music SHALL NOT slide continuously. Source identities and relation ownership SHALL remain truthful through spatial wraps.

#### Scenario: Naturally centered active passage
- **WHEN** an active bounded display is fitted before count-in
- **THEN** its complete initial notation and continuous staff are naturally centered with substantial outer breathing room and a clear left inset
- **AND** subsequent hides/refills do not recenter the live surface or change the protected current measure

#### Scenario: Live finger display and status changes retain reading references
- **WHEN** measured count-in or playing toggles finger display, changes status text or refills without a viewport change
- **THEN** source residency and reading retirement continue through live finger display while common scale and screen origin remain fixed
- **AND** Free view, error and preparation phases do not fabricate accepted attacks or advance live residency

#### Scenario: Protected and eligible source positions
- **WHEN** measured practice has accepted every required attack in an older measure and entered a later reading measure
- **THEN** its ordinary ink can retire as incoming music is atomically allocated around the current measure
- **AND** continuing sound is assessed independently, with readable authored tie cues where applicable
- **AND** unread attacks, errors and unmeasured runs cannot manufacture automatic retirement

#### Scenario: A joined run wraps through fixed positions
- **WHEN** replacement displays resident bars across a genuine reading-order wrap
- **THEN** staff lines remain continuous and aligned, with correctly attached source barlines and accessible source identities
- **AND** ties and slurs retain verified musical endpoints without inventing a relation between nonconsecutive source notes

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

### Requirement: Consistent practice range rows
Both selector lists and completed/unfinished sections SHALL use one roomier row rhythm, with text vertically centered within highlight and focus borders and aligned first-row baselines. Human measure ranges SHALL use consistently spaced dashes in the existing font without changing saved passage identities. Completed group rows SHALL retain accessible component identity without a redundant visible arrow or a synthetic percentage.

#### Scenario: Mixed completion beside original groups
- **WHEN** completed group ranges and incomplete original ranges appear beside concrete exercise rows
- **THEN** both lists use the same row height, padding and text centering regardless of completion status
- **AND** each focused highlight encloses its centered row content, and three-digit ranges remain clear of right-aligned percentages

### Requirement: Quiet practice range context and progress summary
Practice strips SHALL omit individual measure numbers while retaining accessible source identities and explicit nonconsecutive boundaries. Selector and active header SHALL identify the selected exercise. Each concrete exercise row SHALL show its highest measured or manual-inclusive achieved speed relative to target, without a preparation bonus. Group rows SHALL have no percentage or assessment identity. Total SHALL equally weight all included catalog exercises, including locked exercises. Include manual SHALL remain checked by default and affect presentation only. Library/save totals SHALL use the same manual-inclusive catalog total. Exercise rates SHALL remain independent unless they resolve to the exact same source-owned musical equivalence class, including repeated identical child classes. Heterogeneous exercises SHALL NOT borrow component evidence.

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
- **THEN** current heterogeneous exercise rows retain their own correct achieved-speed percentages without borrowing component or long-run evidence
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

### Requirement: Bottom return guide
Reader, shared Options, selector and active-practice return controls SHALL use Back with Esc. Selector and active practice SHALL retain their bottom controls and existing return targets without a duplicate top-right action. Both actions SHALL remain accessible to mouse and keyboard, and musical status messages SHALL NOT replace the return guide. The selector SHALL group all four arrow hints under one Navigation label rather than separate Browse/Groups explanations, using the existing main Options arrow-first layout, paired arrows, text sizing and spacing rather than a separate hint style. Both shared footers SHALL use Enter Open as a general activation hint without changing the focused control's actual Enter behavior. At ordinary widths, selector guidance and actions SHALL occupy one compact row; they MAY wrap when needed by a narrow viewport. Empty status SHALL NOT waste list height.

#### Scenario: Return from practice to the score
- **WHEN** the user presses Escape in active practice
- **THEN** the selector opens and the guide labels the return Back with Esc
- **WHEN** the user presses Escape in that selector
- **THEN** the full-score reader returns through the existing navigation path

### Requirement: Complete note-ink ownership
All ordinary ink owned by a note SHALL retire together, including ordinary/hollow stems, white interiors, heads, flags, dots and annotations. Hidden ordinary notes SHALL leave no residual duration ink. Shared ink required by another visible owner and unrelated notes/staff SHALL remain correct. A separately classified source-owned held tie cue SHALL use its explicit visual lifetime without retaining the old ordinary bundle.

#### Scenario: A long-duration note becomes hidden
- **WHEN** practice retires an eligible note with a hollow half- or whole-duration stem
- **THEN** the hollow outline and white interior disappear with its ordinary note ink
- **AND** other visible notes and structural staff remain intact
- **AND** any retained tie cue is explicit source-owned continuation paint rather than an orphaned stem or head

#### Scenario: Shared duration and relation ink
- **WHEN** a displayed beam or relation has multiple source owners and some remain visible
- **THEN** paint required by those contributors remains correct without orphaned duration ink from retired ordinary bundles
- **AND** tie cue removal does not alter sounding obligations

### Requirement: Full-window Pause restoration
Entering Free view SHALL stop active or pending playback and restore complete source notation for a consecutive window of up to four selected measures. Full owned ink and source relations SHALL restore through the common ownership model. The window SHALL be naturally centered independently of the live refill canvas. A cyclic resident layout SHALL NOT be used as the Free view window. Original error obligations and source context SHALL remain accessible.

#### Scenario: Pause after ordinary and hollow notes were removed
- **WHEN** the user enters Free view after ordinary or hollow note ink disappeared or its space was reused
- **THEN** a consecutive source window near the current reading location restores complete source notation in natural order and centered framing
- **AND** repeated playing, refill, Free view and Ready cycles preserve source ownership without duplicating retired ink
- **AND** Ready returns to the admitted initial live allocation at the existing count-in transition

### Requirement: Preserve practice modes and musical interaction
The display repair SHALL preserve the existing measured/unmeasured distinction, beat-aligned count-in/repeat and speed transitions within the selected exercise, first-loop eligibility, reversible Done completion, and queued speed changes. Unmeasured practice SHALL retain readable source music without fabricating observed attacks or measured attainment. Existing paused/unmeasured passage-window controls SHALL remain usable.

#### Scenario: Unmeasured loop and manual window change
- **WHEN** a user practises without MIDI and turns a passage window
- **THEN** the source music remains readable and the running clock, tempo, completion eligibility, and retained evidence continue under their existing rules
- **AND** no fabricated matched attack causes note removal or automatic position replacement

#### Scenario: Done or queued speed during repeat
- **WHEN** the user toggles eligible Done through Enter or an assigned pedal, or queues a speed change
- **THEN** the same reversible completion target and musical beat-aligned repeat transition apply within the selected exercise, without selecting another exercise

### Requirement: Supported presentation and shared control compatibility
The passage display and note-ink lifecycle SHALL work in both Conventional piano and Jankó four-row presentations when supplied by the score package. Shared display rotation and input bindings SHALL continue across the relevant interfaces. Layout changes SHALL NOT restart the practice loop or reinterpret its musical state.

#### Scenario: Presentation and rotation checks
- **WHEN** a supported score is inspected in each available keyboard presentation and the shared display is rotated or resized
- **THEN** both affected practice views retain continuous, complete notation and appropriate note ownership
- **AND** input bindings and the active loop's musical state remain consistent

### Requirement: Frozen source and saved-state preservation
Practice presentation repair SHALL preserve prepared score bytes, source/keyboard identities, finger corrections, library, other personal evidence, settings, and practice/attainment/history data. Unsupported source geometry or unresolved ink ownership SHALL be reported explicitly rather than silently inventing musical content or claiming successful rendering.

#### Scenario: Viewing a retained prepared score
- **WHEN** an existing prepared package is opened for selection or practice
- **THEN** its stored pages, recipe authority, source identity, and saved-state bindings remain unchanged
- **AND** a rendering admission failure retains that package and saved data while identifying the unsupported passage

### Requirement: Shared Options menu keyboard binding and name
Options SHALL have a configurable keyboard binding in the shared Keys and pedals interface, available from the full-score reader, passage selection and active practice. Its buttons, dialog title, binding entry, and accessible names SHALL use the same Options label. Configurable buttons SHALL show the current configured control. The default keyboard chord SHALL be O, with conflict-free admission for older preferences that preserves existing assignments and explicitly empty controls using the compatible persisted action identity. The library SHALL retain its Options entry. For an opened score, Score SHALL be a visible expanded section with the current piece subtitle, normal heading hierarchy and aligned settings; it SHALL appear first in reader Options and immediately after Practice in practice Options. Share score SHALL be a visible action beneath score settings, followed by applicable correction and retained-edition actions. Source & review SHALL remain the secondary disclosure.

#### Scenario: Opening Options from either practice interface
- **WHEN** the user presses the configured Options key in passage selection or active practice
- **THEN** the shared Options dialog opens with Practice first in its section list and selected, with applicable Score, audio/MIDI, Piano, Keys and pedals and fingering display sections available
- **AND** active practice follows the existing Pause behavior without changing completion eligibility, progress, or speed policy, and closing Options retains the passage and paused session

#### Scenario: Practice Options describes applicable actions
- **WHEN** Options is opened from passage selection or active practice
- **THEN** its shared binding panel omits irrelevant practice actions such as Edit fingers and page turning where no manual passage window can be browsed
- **AND** an existing page-binding equivalent is labelled Previous measures or Next measures where paused passage-window browsing is supported
- **AND** applicable finger display, Done and Options controls remain available, with Done shown for an active passage
- **AND** hidden rows retain their exact saved binding identities and assignments for the full-score reader, with shared capture, conflict and Test ownership unchanged

#### Scenario: Rebinding and guarded input
- **WHEN** the user changes the Options binding or activates it while a field, modal, or binding capture owns input
- **THEN** the binding entry and reader/practice buttons agree on its name and configured control
- **AND** existing focus, capture, held-key and repeat guards prevent unintended activation

#### Scenario: Older saved controls and the full-score reader
- **WHEN** preferences without the added persisted action are admitted, including preferences that already assign O
- **THEN** all original assignments remain unchanged and the new action receives an available default or fallback
- **AND** explicitly empty Options controls remain empty and a hardcoded reader O does not bypass the configured binding
- **AND** the library Options entry remains available

#### Scenario: Confident opened-score controls
- **WHEN** the user opens Options from the reader
- **THEN** Score and the piece subtitle appear before general device settings, with Transpose aligned
- **AND** Share score is visible without expanding a disclosure
- **AND** correction count and correction actions are proportionate, irrelevant disabled actions are omitted, and Undo restore remains available when applicable
- **AND** expanding Source & review retains provenance and applicable font-license access

#### Scenario: Options without an opened score
- **WHEN** the user opens Options from the library
- **THEN** general settings remain available without an empty Score section or a Transpose control for an unspecified score

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

### Requirement: Free view passage navigation
Free view SHALL show complete consecutive notation in centered four-measure groups and transition windows advancing by two source measures. It SHALL support existing previous/next navigation and retain a final end-aligned window when needed. A shorter selection SHALL show only its real measures. Free view SHALL preserve saved evidence and original source obligation definitions, with the existing pause reset of transient attempt state and no fabricated played attacks.

#### Scenario: Browse four-measure groups and their transitions
- **WHEN** Free view opens on selected measures 1–12 and the user moves right twice from 1–4
- **THEN** it shows centered 3–6 and then centered 5–8, with complete coherent staff, barlines, ties and slurs
- **AND** moving left reverses the same source windows

#### Scenario: Five-measure leaf and held failure context
- **WHEN** a five-measure leaf is opened in Free view
- **THEN** its windows are 1–4 and the bounded final 2–5, without showing an outside measure
- **AND** a failure owned inside the selection can be inspected in its consecutive source window while an earlier carry-in outside the selection retains separate original context

### Requirement: Free view entry respects saved controls
Free view SHALL have one shared configurable control across supported piano, guitar and bass practice, defaulting to V when unclaimed. The same custom key/pedal or explicit empty slots SHALL govern its runtime, hints, capture and Test in each context. Space SHALL start/resume the selected primary mode, or return from Free view to the previous primary mode. Existing authoritative controls SHALL take priority; occupied or explicitly empty mode controls SHALL not be bypassed by hardcoded fallbacks. P SHALL open practice only from the reader. Fields, modifiers, modal/capture, repeats and held-input ownership SHALL remain correct.

#### Scenario: Enter Free view and resume
- **WHEN** the user activates Free view while Reading or Timed is selected
- **THEN** active or pending playback stops and full source notation restores
- **AND** leaving a joined Reading pair opens the normal four-measure browsing window that contains its transition, rather than resetting to an unrelated opening group
- **AND** Space returns to the previous primary mode and explicitly starts/resumes it, with a full count-in only for Timed
- **AND** selecting Reading or Timed itself only stops and selects, without starting playback

#### Scenario: Saved or guarded V
- **WHEN** a saved primary or secondary action already owns R, T or V, a mode control is explicitly empty, or a field/modal/capture owns input
- **THEN** the new default does not steal that input or rewrite the old assignment
- **AND** runtime and visible hints use the same effective admitted controls
- **AND** repeated mode keydown does not repeatedly reset positions or restart transport

### Requirement: Proportionate shared fingering behavior picker
Reader and practice Options SHALL use the same compact fingering behavior picker sized to its contents. It SHALL retain both visibility choices, existing keyboard navigation and mouse activation. The control SHALL NOT stretch across unused row space or change unrelated device picker sizing.

#### Scenario: Open shared Options at ordinary and narrow widths
- **WHEN** the user opens reader or practice Options at an ordinary or narrow viewport
- **THEN** Show fingerings fits its value and dropdown indicator, and both keyboard and mouse can choose press-to-toggle or show-while-held behavior

### Requirement: Inherited Free view navigation controls
Free view Previous/Next controls SHALL inherit the current main-menu controls per input slot until locally overridden. An absent override SHALL follow later main changes; an explicit empty override SHALL unbind only that local slot. Editing a local slot SHALL preserve the main value and other inherited slots. The inheritance behavior SHALL add no reset control or extra editor item. Exact shared settings SHALL retain their single source.

#### Scenario: Main control changes after a local keyboard override
- **WHEN** Free view Previous has a local keyboard override while its MIDI slot is inherited, and the main settings change
- **THEN** the local keyboard value remains, the MIDI slot follows main, and main assignments remain independently editable
- **AND** deliberate local edits create overrides without adding an inheritance reset control or extra editor content

#### Scenario: Explicit local unbinding and conflicts
- **WHEN** a local slot is explicitly unbound or a main/local edit would create a conflict in either effective context
- **THEN** an explicit empty local slot does not fall back to main, and a conflicting edit reports the named conflict without changing saved values or silently discarding an override
- **AND** runtime, binding Test, capture and visible hints use the same effective admitted controls

### Requirement: Bounded exercise browsing
Passage selection SHALL browse original sections, independent adjacent doubles and contrast exercises through completed groups and incomplete originals, without recursive growing joins. Existing column geometry, row spacing, concrete-exercise right-aligned percentages and accessible source/component identity SHALL remain stable. Group rows SHALL open contents without being practice targets. Originals and doubles SHALL retain coherent source previews; contrasts SHALL identify both excerpt locations without implying the intervening source is played. Attainment SHALL remain independent unless it resolves to the exact same source-owned musical equivalence class, including repeated identical child classes. Heterogeneous exercises SHALL NOT borrow component evidence.

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

### Requirement: Stable short-passage practice framing
Selected passages of at most four measures SHALL retain one complete-source stationary fit across Ready, MIDI/manual Start, count-in and playing within an unchanged viewport. Connection status or preparation state SHALL NOT reduce notation size or move its source reading references. Source-owned note retirement and held cues SHALL preserve structural staff and real measure frames; Free view SHALL restore all owned ink.

#### Scenario: Start with a piano connected
- **WHEN** a four-bar passage enters measured count-in and then trial from Ready
- **THEN** its source note positions, common scale and staff frame remain identical to the established Ready geometry
- **AND** disconnected Start uses the same framing, without accepting invented attacks

### Requirement: Current practice speed lattice
Fresh practice Starting speed SHALL be 10% of the performance target, Connection speed SHALL independently default to 50%, and fresh Increase per success SHALL default to 2%. Explicit selection of a new passage SHALL use the configured start for its category rather than saved workingByPattern or the previous passage. Connections SHALL require joined adjacent components with independently complete original leaves; labels or a completed parent alone SHALL NOT establish that category. Resume, repeat and restoration of the same session SHALL retain current captured/queued speed. Current starting/connection/working/increase controls SHALL admit half-percentage-point units, including typed, held, restored and automatic changes. The truthful native lower tempo limit MAY impose the nearest legal lattice floor. Present custom or historically ambiguous increments SHALL remain exact; changing an existing setting to 2% SHALL be an explicit setting edit. Raw attainment and history SHALL remain exact. An attempt SHALL capture its rate; live requested changes SHALL apply at the next musical boundary without changing its clock or crediting an unplayed rate.

#### Scenario: Fresh target and queued working speed
- **WHEN** a fresh passage has target 360/min and the user presses Up while playing
- **THEN** it starts at 36/min (10%) and requests 10.5% for the next attempt
- **AND** the current attempt remains at 10% through completion and records that actual rate

#### Scenario: Select new material after a fast passage
- **WHEN** the user selects an unfinished leaf after practising another passage at 70%
- **THEN** the leaf starts at its configured Starting speed, default 10%, even if a historical workingByPattern value exists
- **AND** its raw attainment and custom increment remain unchanged

#### Scenario: Select a completed connection
- **WHEN** the user selects a joined adjacent run whose original leaves are independently complete
- **THEN** it starts at independently editable Connection speed, default 50%, with a fresh default increase of 2%
- **AND** resuming or repeating that same session retains its requested/captured working speed

### Requirement: Editable source-meter repeat cue
Practice SHALL default to two count-in bars of the entry source meter, configurable from one to eight in Options. Startup, resume and every repeat SHALL supply a consistent audible metric hierarchy aligned to the overarching source beat structure and exact entry phase. Strict musical grid V3 SHALL bind the chosen bars and source phase; historical V2 replay SHALL remain literal and unrelated Performance policy SHALL remain unchanged.

Ordinary repeats SHALL supply the configured cue without adding surprise bars because of unrelated journal persistence or UI work. Preparation SHALL preserve final-attack authority and captured-rate credit. A genuine backend readiness failure SHALL produce an honest stopped/refused state rather than a shortened, skipped, off-grid or concealed cue.

#### Scenario: Compound-meter entry and repeat
- **WHEN** a 6/8 passage starts or repeats at 10% working speed
- **THEN** two complete 6/8 count-in bars clearly cue their two principal beats and subordinate subdivisions
- **AND** source entry and subsequent repeats retain exact phase and queued-rate alignment

#### Scenario: Repeat while a journal save is pending
- **WHEN** an accepted attempt completes while unrelated serialized persistence is still pending
- **THEN** the next complete configured count-in remains aligned to the admitted musical boundary without an extra bar
- **AND** only accepted attacks and the captured actual rate determine the completed evidence

### Requirement: Continuous native metronome waveform
An admitted native click SHALL advance by emitted output sample frames after its eligible onset. Callback presentation-time jitter SHALL NOT reset its waveform phase across blocks or armed repeats. Existing timbre, gain, accents, strict onset admission, cancellation and output-device policy SHALL remain unchanged.

#### Scenario: Armed repeat across jittered callbacks
- **WHEN** a repeat cue spans varying callback blocks with monotonic presentation estimates containing small jitter
- **THEN** its PCM remains continuous at the admitted sample rate and preserves the same crisp click waveform as an initial cue
- **AND** lifecycle horizons and musical receipts retain their independent authority

### Requirement: Visible editable resume cooldown
Practice error recovery SHALL guard resume for an Options-configured cooldown of zero to thirty seconds, default three. While guarded, a subtle centered lock silhouette SHALL show remaining seconds inside its body, then disappear at expiry. A blocked pointer or keyboard Resume SHALL retrigger one brief, restrained horizontal shake without resetting the guard or moving notation. Reduced-motion preferences SHALL disable the shake without removing the countdown. Close, changed attempt and cancellation SHALL clear obsolete timers without delayed musical activation.

#### Scenario: Error recovery
- **WHEN** a default practice attempt fails and the user presses Resume before three seconds elapse
- **THEN** playback remains stopped and the visible lock explains the remaining wait
- **AND** resume becomes available at expiry without starting automatically
- **AND** the number sits within the lock body and a blocked press provides brief feedback without changing the remaining wait or staff geometry

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

### Requirement: Selectable Reading and Timed practice
Piano practice SHALL open newly selected passages in Reading regardless of prior groundwork or attainment. Reading SHALL practise source-owned positions and adjacent positions without time deadlines and cycle again without automatic Timed entry. Timed SHALL practise the entire selection with the existing musical count-in/repeat and measured/manual rules. Mode selection SHALL stop active/pending playback; Space SHALL explicitly start/resume the selected mode.

#### Scenario: Reusable note learning
- **WHEN** a connected player opens a previously completed passage and starts Reading
- **THEN** correct source notes advance the untimed position and adjacent-position sequence, wrong notes retain a recoverable source-owned error, and pauses do not impose a timing deadline
- **AND** completing the sequence cycles back to its beginning without playing a metronome or changing raw measured/manual attainment
- **AND** selecting Timed stops Reading and waits for Space before supplying the complete musical count-in

#### Scenario: Stop ownership through mode changes
- **WHEN** a mode is changed during pending startup, an active attempt, or a future repeat cue
- **THEN** stale preparation and callbacks cannot start transport or apply a completion to the new mode
- **AND** opening Options or losing focus stops the active mode while retaining the selected primary mode
- **AND** pitch-hold preparation gestures cannot implicitly start Timed

#### Scenario: Disconnected Reading and capability boundaries
- **WHEN** a piano passage is opened in Reading without MIDI
- **THEN** its complete stable source notation remains available without fabricated matched notes, automatic position advances, tempo achievement or Done eligibility
- **AND** Timed remains explicitly available with its existing manual Done behavior
- **AND** instrument-neutral manual practice retains its existing capability-bound transport without invented piano positions, hands or MIDI assessment

### Requirement: Joined Reading cycles source boundaries
Reading for an unlocked joined passage SHALL cycle only the last measure before each original segment boundary and the first measure after it. The current join SHALL show a subtle top-right fraction inside the notation area and expose its measure range accessibly. Ordinary leaves SHALL omit this counter. Completing a join SHALL move to the next join and eventually cycle back, without recording tempo achievement.

#### Scenario: Three joins in a sixteen-measure passage
- **WHEN** Reading opens measures 1–16 made from original segments 1–4, 5–8, 9–12 and 13–16
- **THEN** the sequence practises measures 4–5, 8–9 and 12–13, labelled 1/3, 2/3 and 3/3 inside the top-right corner
- **AND** each two-measure source window retains complete source ownership and connected ties/slurs without outside fabricated measures
- **AND** after the last join it repeats the first join while Timed remains the whole 1–16 selection

#### Scenario: Original component target authority
- **WHEN** the app considers unlocking a new larger joined passage
- **THEN** every original underlying component must have attained its current performance target using the existing admitted measured/manual evidence criterion
- **AND** a completed parent's own run cannot substitute for a missing original component's completion
- **AND** retained saved joins and original raw evidence remain readable without rewriting history

#### Scenario: Join with empty or held-only source material
- **WHEN** a source boundary contains a rest or no new attacks on one side
- **THEN** the join retains its actual source measure context, finite advance/cycle behavior and truthful counter
- **AND** held sound or rest material cannot become fabricated attacks or speed attainment

### Requirement: Primary modes and configurable controls
Reading, Timed, Start/Resume and applicable Done and Speed SHALL form one compact centered primary command group. The visible speed label SHALL be Speed, and its control SHALL sit beside the transport rather than in a separate right-side wing. Free view SHALL remain secondary alongside Options and Back. Speed and Lock current speed SHALL apply only to Timed; Done SHALL appear only in applicable disconnected Timed practice. Reading, Timed and Free view SHALL have scoped configurable keyboard/pedal controls with unclaimed defaults R, T and V. The unclaimed shared Rotate shortcut SHALL be Shift+R in the library, reader and practice, and bare R SHALL no longer be a hidden rotation fallback. Explicit saved Reading assignments and empty or occupied slots SHALL remain exact without rewriting preferences. Local navigation inheritance SHALL remain intact.

#### Scenario: Reading and Timed command layout
- **WHEN** either primary mode is shown with or without a MIDI connection
- **THEN** both mode choices and Start/Resume remain in the same primary control group, Free view remains secondary, and the selected mode is accessible
- **AND** half-point Left/Right working-speed adjustment and queued boundary changes operate in Timed without sequential footer navigation or a previous mouse click stealing the command
- **AND** Reading does not silently alter Timed working speed

#### Scenario: Binding capture and test
- **WHEN** a mode binding is edited or tested in shared Options
- **THEN** runtime, capture, conflict diagnostics, Test and visible hints use the same admitted effective slots
- **AND** shared reader assignments and explicit local navigation overrides remain exact
- **AND** Reading/Timed actions are unavailable without their supported piano mode context, while Free view uses the same shared binding in neutral manual practice

#### Scenario: Reading and rotation default separation
- **WHEN** practice controls omit an unclaimed Reading slot
- **THEN** R selects Reading, while unclaimed Shift+R rotates consistently in the library, reader and practice
- **AND** explicit saved Reading U, empty Reading slots and existing R or Shift+R owners retain their authority
- **AND** neither bare-R rotation fallback survives, nor can field editing, modal/capture or held/repeated input rotate unexpectedly

#### Scenario: Shared Free view across instruments
- **WHEN** the user configures Free view to a custom key or pedal in piano practice and then opens guitar or bass manual practice
- **THEN** the same control enters Free view and is shown in its hint and Options; the old V route does not remain as a hidden fallback
- **AND** an explicit empty Free view control remains empty in every supported instrument context without adding piano hand-position assessment

### Requirement: Direct working-speed commands
The active practice footer SHALL expose direct shortcuts and mouse actions without sequential keyboard navigation through its controls. Timed piano and neutral manual practice SHALL offer Left/Right working-speed changes of 0.5 percentage points with a compact horizontal decrease/value/increase presentation labeled Speed in the centered primary command group beside Resume and applicable Done. Inherited/default previous/next arrows SHALL route to speed in those contexts; explicit local navigation overrides and other saved action/modifier owners SHALL remain authoritative. Reading and Free view SHALL retain their meaningful browsing actions. Unclaimed S or clicking the value SHALL enter a numeric draft, Enter SHALL commit through existing admission and queued boundary rules, and Escape SHALL cancel without triggering Back. Enter outside editing SHALL preserve the existing Done control. The single Speed frame SHALL order its name, horizontal indicator and available S hint. Its readonly integer SHALL remain centered in a fixed numeric area while a fractional suffix extends to its right without moving the frame, percent, chevrons or hint. The same genuine input SHALL retain semantic, pointer, draft and setting authority; any visual mirror SHALL be noninteractive, aria-hidden and refreshed from that field after authoritative updates, repaint, commit and cancellation. Draft focus SHALL be indicated on that outer frame without an inner input rectangle; caret and selection SHALL remain visible. Shared kbd hints SHALL never carry text decoration, including inherited active-control underlines. The contextual S speed command SHALL preserve explicitly saved S action ownership and the full-score reader’s scale shortcut outside active practice. Options and the passage selector SHALL retain their real keyboard navigation.

#### Scenario: Direct speed after a mouse action
- **WHEN** a user clicks a practice mode or transport control and then presses the available unmodified working-speed arrows in Timed or neutral manual practice
- **THEN** Left decreases and Right increases speed by 0.5 percentage points without navigating footer buttons or changing the score window
- **AND** the number and arrow hints represent the same available commands while captured and queued rates keep their existing musical semantics

#### Scenario: Explicit speed draft
- **WHEN** the user opens the working-speed draft through an unclaimed S or a mouse click and types a new value
- **THEN** typed prefixes do not change current or queued speed, Enter commits the admitted value, and Escape discards the draft
- **AND** neither Enter nor Escape leaks into Done or Back, and a saved S owner is not replaced by a hidden fallback

#### Scenario: Arrow commands in browsing modes
- **WHEN** Reading or Free view is selected
- **THEN** its configured previous/next controls browse the appropriate position/join or overlapping measure window without changing Timed speed
- **AND** footer mouse actions and repainting do not create a keyboard menu

### Requirement: Stable mode frame without an instruction row
Reading, Timed, Free view and connected/disconnected practice SHALL share stage and footer bounds at an unchanged viewport. An unchanged source window SHALL retain its complete source scale and origin across mode/start/error transitions; changing owned visibility SHALL not refit it. Generic preparation/ready instructions SHALL consume no layout row. Meaningful errors and carry context SHALL remain accessible without moving notes or controls.

#### Scenario: Stable leaf and mode switches
- **WHEN** a four-measure leaf switches among Reading, Timed, Free view, Ready and error/restart states or MIDI connection changes
- **THEN** the complete source frame, stage height and control-row positions stay fixed
- **AND** hidden note ink restores through the full common ownership model without residual stems, orphaned relations or lost measures
- **AND** the reclaimed instruction-row space belongs to the notation area

#### Scenario: A new join window
- **WHEN** Reading moves to a different actual boundary pair
- **THEN** the changed source window is naturally fitted using its complete source geometry while the stage and footer bounds remain fixed
- **AND** the overlay counter, full-source restoration and meaningful status do not add rows or overlap required musical ink

### Requirement: Fresh Timed defaults preserve saved preferences
New piano Timed preferences SHALL default to 30% starting speed, 50% completed-connection speed and 2% increase per success, on the existing half-point speed grid. New passage selections SHALL use their configured default without carrying the previous section's working speed. Present saved preferences, raw earned rates, groundwork, journals and personal/package identity SHALL remain intact; Reading SHALL not write earned speed or manual completion.

#### Scenario: New and retained settings
- **WHEN** a practice state has no saved settings
- **THEN** Timed starting speed is 30%, completed connection speed is 50%, and Increase per success is 2%
- **WHEN** retained settings specify different admitted defaults
- **THEN** those values and existing attainment remain intact and reopening Reading does not rewrite them

#### Scenario: New selection and same-session repeat
- **WHEN** a different passage is selected
- **THEN** its Timed working speed uses the configured fresh/connection starting rule
- **AND** same-session resumes and Timed repeats retain their captured/queued rates under the existing immutable beat-grid rules
