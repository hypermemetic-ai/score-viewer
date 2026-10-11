# Spec Delta

## Purpose

Let players inspect and edit scores without automatic note following, and make direct personal hand/finger choices with faithful, responsive notation and recoverable saved state.

## ADDED Requirements

### Requirement: Passive score interaction outside section practice
The reader, editor, selector and Free view SHALL NOT interpret played notes as score matches, highlight matched notes, move edit selection, turn pages or earn attainment. Musical interpretation SHALL be admitted only for section Reading/Timed and their owned preparation. Full-score Performance execution SHALL be retired without deleting historical records.

#### Scenario: Playing while viewing or editing
- **WHEN** MIDI notes arrive outside section Reading/Timed or their owned preparation
- **THEN** score position, page, selection, notation highlighting and attainment remain unchanged
- **AND** explicit keyboard/pedal commands, independent piano sound and Options diagnostics/configuration remain available

#### Scenario: Free view and re-entry
- **WHEN** a player plays while inspecting Free view, then explicitly resumes Timed practice
- **THEN** Free view does not match or follow the score
- **AND** legitimate held-key bookkeeping is available for admitted practice re-entry without fabricating played attacks
- **AND** an old full-score Performance action cannot start grading or automatic page following

### Requirement: Whole-system vertical edit navigation
Edit-mode Up/Down SHALL select an editable note in the previous/next whole system in written page order, minimizing horizontal distance from the current note. Ties SHALL resolve deterministically by vertical proximity then source order. Crossing a page boundary SHALL reveal the destination page. At score ends selection SHALL remain unchanged.

#### Scenario: Adjacent system across a page
- **WHEN** Down is pressed at an editable note in the last system of a page
- **THEN** selection moves to the horizontally nearest editable note in the next page's first eligible system and that page becomes visible
- **AND** Up follows the equivalent reverse rule; empty systems are skipped without fabricating a target
- **AND** Left/Right/Tab retain existing chronological navigation

#### Scenario: Visible continuation and input ownership
- **WHEN** the target system contains a selectable continuation alias
- **THEN** navigation can select that visible occurrence while retaining its genuine source identity
- **AND** editors, toolbar navigation, modals and binding capture keep their own arrow-key ownership

### Requirement: Direct personal hand and finger decisions
In note editing, L/R SHALL assign the selected note's effective performing hand as a persistent personal choice, including a choice different from imported hand authority. A hand key SHALL retain its current finger number and selection; finger digits SHALL retain existing advance behavior. The original assignment SHALL remain recoverable, and equivalent-looking recurrences SHALL NOT be edited automatically.

#### Scenario: Change hand then finger
- **WHEN** the player selects a left-hand note with finger 3, presses R, then enters 2
- **THEN** the selected note first becomes an effective right-hand note with finger 3, without advancing
- **AND** the subsequent digit sets finger 2 on that same source target before existing advance behavior applies
- **AND** notation and practice consume that effective personal assignment

#### Scenario: Source instructions and coherent aliases
- **WHEN** the personal hand differs from a retained source/editorial hand indication
- **THEN** the personal choice controls effective performance while the original source statement remains recoverable with its provenance
- **AND** ties and duplicate appearances of the same selected source target remain coherent
- **AND** independent notes elsewhere remain unchanged

### Requirement: Faithful fast visible edits
Hand/finger editing SHALL aim for the next display frame and SHALL achieve correctly rendered visible updates within 100 ms at the 95th percentile on named warm-score/device benchmarks. Each keystroke SHALL avoid complete calculator/package regeneration and waiting for durable saves. Hand changes SHALL update actual dependent notation through shared engraving rules, not only a hand label.

#### Scenario: Measured hand update
- **WHEN** the benchmark applies repeated hand/finger edits to warmed named scores
- **THEN** key-receipt-to-correct-visible-paint measurements meet the p95 target and record fixture sizes, host, viewport and presentation
- **AND** changed stems, beams, rests, finger placement and affected layout are coherent at the measured completion point
- **AND** slow or failed edits are included in the result rather than excluded as unfinished work

#### Scenario: Selection survives reflow
- **WHEN** a hand change alters system/page geometry
- **THEN** the selected source target remains selected and visible after an atomic coherent update
- **AND** unrelated source content and finger choices remain intact

### Requirement: Ordered nonblocking personal edit persistence
Accepted hand/finger edits SHALL reserve their source targets at key arrival and persist in order without blocking later editing. Save/render failure SHALL be explicit and SHALL retain recoverable durable state and pending edit intent. Old source packages, personal corrections/history, library, settings and raw practice records SHALL not be silently replaced or discarded.

#### Scenario: Rapid input during delayed saving
- **WHEN** L/R and finger digits arrive faster than disk writes complete
- **THEN** each edit affects its reserved source target in arrival order
- **AND** later navigation or redraw does not redirect an accepted edit
- **AND** reopening after successful persistence restores the effective choices

#### Scenario: Failure or supersession
- **WHEN** a save/render fails or the player switches score editions during pending work
- **THEN** the failure or stale result cannot overwrite another edition or claim successful durable saving
- **AND** the last valid saved state and pending source-bound intentions remain recoverable

### Requirement: Effective assignments shared with practice and calculation
Reader, annotations, section practice and explicit future calculation SHALL resolve one source-guarded effective personal assignment map. Changing a hand SHALL retain old raw evidence but SHALL NOT relabel it as attainment under a different hand assignment. Finger-only edits SHALL preserve existing attainment behavior.

#### Scenario: Changed hand and retained evidence
- **WHEN** a personal hand changes in a previously practiced passage
- **THEN** affected current practice identities reflect the effective assignment while old claims remain recoverable
- **AND** unrelated exercises retain eligible evidence and new-hand attainment is not fabricated
- **AND** an explicit recalculation respects the current personal hand/finger constraints

