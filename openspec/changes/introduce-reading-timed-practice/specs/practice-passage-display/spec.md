# Practice modes delta

## REMOVED Requirements

### Requirement: Once-only preparation and clear active controls
**Reason**: Untimed note reading must remain a selectable practice mode rather than a once-only introduction that is skipped after attainment.
**Migration**: Retain existing groundwork and speed evidence literally. Open newly selected piano passages in Reading, and use the explicit Timed choice to practise the whole passage at tempo. No Restart preparation action is introduced.

## MODIFIED Requirements

### Requirement: Free view entry respects saved controls
Free view SHALL have one shared configurable control across supported piano, guitar and bass practice, defaulting to V when unclaimed. The same custom key/pedal or explicit empty slots SHALL govern its runtime, hints, capture and Test in each context. Space SHALL start/resume the selected primary mode, or return from Free view to the previous primary mode. Existing authoritative controls SHALL take priority; occupied or explicitly empty mode controls SHALL not be bypassed by hardcoded fallbacks. P SHALL open practice only from the reader. Fields, modifiers, modal/capture, repeats and held-input ownership SHALL remain correct.

#### Scenario: Enter Free view and resume
- **WHEN** the user activates Free view while Reading or Timed is selected
- **THEN** active or pending playback stops and full source notation restores
- **AND** Space returns to the previous primary mode and explicitly starts/resumes it, with a full count-in only for Timed
- **AND** selecting Reading or Timed itself only stops and selects, without starting playback

#### Scenario: Saved or guarded V
- **WHEN** a saved primary or secondary action already owns U, T or V, a mode control is explicitly empty, or a field/modal/capture owns input
- **THEN** the new default does not steal that input or rewrite the old assignment
- **AND** runtime and visible hints use the same effective admitted controls
- **AND** repeated mode keydown does not repeatedly reset positions or restart transport

### Requirement: Clear selector and practice settings presentation
Selector rows SHALL retain achieved-speed percentages and genuine completion evidence while omitting redundant visible Not yet completed wording. Shared tempo controls SHALL place small up/down chevrons vertically inside the numeric box's right edge and reserve space for their focus borders without overlapping the entered value or neighboring controls. Numeric values SHALL be centered in slightly narrower boxes; the three Practice numeric boxes SHALL align in one column regardless of external unit length. `%` and the beat-unit marking SHALL remain outside the numeric box. Visible absolute per-minute units SHALL consistently use `/min`, with spelled-out accessible labels. Full-score Performance Tempo SHALL display a percentage above the absolute Score reference; Practice Performance target SHALL remain absolute. Performance percentage edits SHALL preserve exact selected rates and existing absolute admission, clock and record meaning. Mouse adjustment behavior and established field-specific increments SHALL remain available. Performance-target explanations SHALL agree with the displayed metronome marking and identify the reference for percentage controls; Performance helper text SHALL plainly describe the chosen tempo, note/timing checks and available fingerings without changing assessment. A fresh practice state's default increase per success SHALL be 2% of its performance target; retained saved increases and achievements SHALL remain unchanged.

#### Scenario: Uncompleted selector row and focused tempo decrement
- **WHEN** an uncompleted group is shown in the selector or a tempo decrement button receives focus
- **THEN** the row communicates progress without redundant incomplete-status wording
- **AND** the down chevron sits below the up chevron inside the numeric box's right edge, with its focus border in its own visible space without covering the entered value
- **AND** the percentage or metronome unit remains outside the numeric box

#### Scenario: Target marking and fresh increase
- **WHEN** a fresh practice state opens the Practice section in Options
- **THEN** its increase per success reads 2% and its performance target retains the metronome marking
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

## ADDED Requirements

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
Reading and Timed SHALL be prominent centered choices beside Start/Resume. Free view SHALL remain secondary alongside Options and Back. Working speed and Lock current speed SHALL apply only to Timed; Done SHALL appear only in applicable disconnected Timed practice. Reading, Timed and Free view SHALL have scoped configurable keyboard/pedal controls with unclaimed defaults U, T and V. Shared rotation and local navigation inheritance SHALL remain intact.

#### Scenario: Reading and Timed command layout
- **WHEN** either primary mode is shown with or without a MIDI connection
- **THEN** both mode choices and Start/Resume remain in the same primary control group, Free view remains secondary, and the selected mode is accessible
- **AND** half-point Up/Down working-speed adjustment and queued boundary changes operate in Timed without being stolen by footer navigation
- **AND** Reading does not silently alter Timed working speed

#### Scenario: Binding capture and test
- **WHEN** a mode binding is edited or tested in shared Options
- **THEN** runtime, capture, conflict diagnostics, Test and visible hints use the same admitted effective slots
- **AND** shared reader assignments and explicit local navigation overrides remain exact
- **AND** Reading/Timed actions are unavailable without their supported piano mode context, while Free view uses the same shared binding in neutral manual practice

#### Scenario: Shared Free view across instruments
- **WHEN** the user configures Free view to a custom key or pedal in piano practice and then opens guitar or bass manual practice
- **THEN** the same control enters Free view and is shown in its hint and Options; the old V route does not remain as a hidden fallback
- **AND** an explicit empty Free view control remains empty in every supported instrument context without adding piano hand-position assessment

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
