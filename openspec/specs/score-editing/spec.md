# score-editing Specification

## Purpose

Let players inspect and edit scores without automatic note following, and make direct personal hand/finger choices with faithful, responsive notation and recoverable saved state.

## Requirements

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
- **AND** Left/Right follow the current Notes/Measures mode while Tab retains chronological note navigation

#### Scenario: Visible continuation and input ownership
- **WHEN** the target system contains a selectable continuation alias
- **THEN** navigation can select that visible occurrence while retaining its genuine source identity
- **AND** editors, toolbar navigation, modals and binding capture keep their own arrow-key ownership

### Requirement: Direct personal hand and finger decisions
In note editing, L/R SHALL assign the selected note's effective performing hand as a persistent personal choice, including a choice different from imported hand authority. A hand key SHALL retain its current finger number and selection; finger digits SHALL retain existing advance behavior. The original assignment SHALL remain recoverable. Exact matching recurrences SHALL follow personal-fingering-memory rules; resemblance alone SHALL NOT authorize propagation. A deliberate hand choice SHALL also apply, without being stored there, to every other note of the score that is the same note, stands on the same beat of its bar (counted from the downbeat), is struck with the same notes of the moved note's written hand, and has the same neighbour on at least one side in that hand. The same note means the same pitch, duration, written value and ties, articulation, slur membership and graces. The neighbours are the notes the source writes in that hand at the onset just before the note and just after it, across the barline if need be, alike in pitch, place, duration and those marks; a side with no such note SHALL NOT match, so a note with nothing before it is decided by the note after it alone. The other side and notes further away in that hand MAY differ, and the other hand SHALL NOT be compared. Choosing the written hand where a note has no hand of its own SHALL store nothing.

#### Scenario: Change hand then finger
- **WHEN** the player selects a left-hand note with finger 3, presses R, then enters 2
- **THEN** the selected note first becomes an effective right-hand note with finger 3, without advancing
- **AND** the subsequent digit sets finger 2 on that same source target before existing advance behavior applies
- **AND** notation and practice consume that effective personal assignment
- **AND** retaining 3 during the hand edit does not falsely record a new finger choice

#### Scenario: Source instructions and coherent aliases
- **WHEN** the personal hand differs from a retained source/editorial hand indication
- **THEN** the personal choice controls effective performance while the original source statement remains recoverable with its provenance
- **AND** ties and duplicate appearances of the same selected source target remain coherent
- **AND** nonmatching independent notes remain unchanged, while exact reusable matches follow their shared or local authority

#### Scenario: Hand change reaches the same music written short
- **WHEN** the player moves Schumann Op. 68 No. 13 bar 11's LH E4 and D#4 to the right hand, in the written-out form
- **THEN** bar 21's E4 and D#4 are also right-hand notes, and the editor names bar 11 as their source
- **AND** bar 21's D#4 follows though the left hand goes on to other notes after it: the chord before it is the same
- **AND** no record is written for bar 21, and the bass notes and every other note keep their hands
- **AND** a bar whose left hand differs both before and after each moved note is not changed

#### Scenario: The other hand differs
- **WHEN** a moved note's hand plays the same passage at a return, but the other hand plays other notes there
- **THEN** the return takes the moved hand

#### Scenario: Duration or articulation differs
- **WHEN** a return plays the same pitches in the moved note's hand, but the moved note or a note struck with it differs there in pitch, duration or written value (a dotted quarter against a tied quarter and eighth), staccato, accent or slur, or the notes just before and just after it in that hand both differ
- **THEN** that return keeps its hands

#### Scenario: One neighbour differs
- **WHEN** a return plays the moved note with the same note just before it in its hand, but another note just after it (or the other way round)
- **THEN** that return takes the moved hand

#### Scenario: A difference further away
- **WHEN** a return plays the moved note with the same neighbour in its hand, but another note of that hand further away differs, in the same bar or beyond
- **THEN** that return takes the moved hand (No. 13 bar 6's first note reaches bar 7, though only bar 6 has a grace before its last eighth)

#### Scenario: Keep, don't share and reset, note by note
- **WHEN** the player presses L or Keep its written LH at bar 21's carried E4, or Don't share this note's hand at bar 11's E4
- **THEN** that note keeps its own hand, the other bar's E4 keeps its own effective hand, and any other note of bar 21 that follows bar 11 still does
- **AND** the notice names the note and what happened to it before the bars it changed
- **AND** Use bar 11's hand or Share this note's hand returns to the shared hand, and choosing the written hand at bar 11 undoes the change in both bars

#### Scenario: An edit at a return
- **WHEN** the edition changes a note's hand at a return, as No. 14's edition moves bar 30's second A3 from the RH it is written in to the LH, and the player moves bar 60's matching A3 to the right hand
- **THEN** bar 30's A3 keeps its edited LH, beamed with the LH, with its finger on the LH side; a return with no edit at that note still takes the move
- **AND** at every note the order is: the edit made at that note (the player's own or the edition's), then a hand carried from a return, then the source's hand, so each place keeps its own edit

#### Scenario: A move in bar 11's pickup
- **WHEN** the player also moves bar 11's pickup B4, which bar 21, written short, does not play
- **THEN** bar 11's E4 still reaches bar 21, and the pickup's hand does not reach bar 21

#### Scenario: Pickups
- **WHEN** a hand is moved in a pickup bar, or in a full bar's last beats that a pickup bar repeats
- **THEN** it reaches the same note at the same beat counted from the downbeat with the same neighbour on one side, never a full bar's downbeat
- **AND** the opening pickup, with nothing before it, is decided by the note after it: No. 13 bar 11's pickup B4 reaches the opening B4 of bar 1, which the same C#5 follows

#### Scenario: L, then R, on a folded repeat
- **WHEN** the player presses L at bar 10's E4 in No. 13, written in the right hand and folded with bar 20, then R
- **THEN** the stored records are exactly as before: no record for bar 10 and none for bar 20

#### Scenario: L, then R, at a carried note
- **WHEN** the player presses L at bar 21's carried E4, then R
- **THEN** bar 21's E4 follows bar 11 again, with no hand of its own, and keeps any finger given to it
- **AND** a later change at bar 11 reaches it

#### Scenario: A hand saved with a finger
- **WHEN** a note's record holds its written hand without recorded intent, as finger edits saved before 2026-10-14 did, and a matching bar carries another hand to it
- **THEN** the page, practice and calculator requests all take the carried hand, and the record's finger stays
- **AND** opening the score rewrites nothing

#### Scenario: Older hand records
- **WHEN** a note's hand was moved before hand choices recorded their intent, and a matching bar exists
- **THEN** the editor shows at that note that pressing its hand key shares it, naming the bars, and nothing travels or is migrated until then

#### Scenario: Practice follows the page
- **WHEN** bar 21 takes bar 11's right hand
- **THEN** practice, Fingers and calculator requests use the right hand for bar 21's E4 and D#4, and an exception made there wins

#### Scenario: Undrawable recurrence
- **WHEN** a matching bar would be left with a key that is half without a hand, or the engraver refuses the carried hand there on opening or after an edit
- **THEN** that bar keeps its written hands, the player is told which bar and why, and the change itself is saved
- **AND** nothing is written for the receiving bar: no record and no "hand here only" choice, and opening the score saves nothing

### Requirement: Faithful fast visible edits
Hand/finger editing SHALL aim for the next display frame and SHALL measure correctly rendered visible updates on named warm-score/device benchmarks, retaining 100 ms at the 95th percentile as a tuning goal. Delivery MAY proceed at the achieved measured speed under the user's accepted performance trade-off; measurements SHALL distinguish end-to-end visible latency from source-only calculation and SHALL not claim the 100 ms goal was met unless the evidence establishes it. Each keystroke SHALL avoid complete calculator/package regeneration and waiting for durable saves. Hand changes SHALL update actual dependent notation through shared engraving rules, not only a hand label.

#### Scenario: Measured hand update
- **WHEN** the benchmark applies repeated hand/finger edits to warmed named scores
- **THEN** key-receipt-to-correct-visible-paint measurements report median, p95 and whether the tuning goal was met, and record fixture sizes, host, viewport and presentation
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
Reader, annotations, section practice and explicit future calculation SHALL resolve one source-guarded effective personal assignment map. Hand and finger edits SHALL preserve attained progress for the same complete exercise. Historical evidence SHALL retain its original assignment provenance without automatic reset, hidden credit or reduced completion. Current practice SHALL use the current effective assignments. A provenance indication SHALL be quiet and nonintrusive; resetting progress SHALL require an explicit player action.

#### Scenario: Changed hand and retained evidence
- **WHEN** a personal hand changes in a previously practiced passage
- **THEN** current practice uses the effective assignment and the passage retains its credited progress
- **AND** old claims retain their original assignment provenance without claiming they were performed with the new choices
- **AND** no progress is reset unless the player explicitly requests it
- **AND** an explicit recalculation respects the current personal hand/finger constraints

### Requirement: Toggle between note and measure editing navigation
Editing SHALL start in Notes mode. A bindable toggle, defaulting to Space, SHALL switch Notes/Measures without moving selection and visibly expose the current mode. Left/Right in Measures SHALL select the first editable contact in the adjacent eligible written measure across page boundaries, without wrapping. Tab/Shift+Tab and digit auto-advance SHALL remain note-based, and Up/Down SHALL remain system-based.

#### Scenario: One-handed measure navigation
- **WHEN** the player presses Space then Right while editing
- **THEN** Measures mode remains active and selection moves to the next eligible written measure's first editable contact
- **AND** the destination page is revealed, another Space restores Notes mode, and leaving editing resets the next session to Notes

#### Scenario: Empty measure, continuation or endpoint
- **WHEN** measure navigation encounters a measure without editable contacts, a measure with only a selectable continuation, or a score endpoint
- **THEN** truly empty measures are skipped, a continuation remains selectable in its visible measure, and an endpoint leaves selection unchanged
- **AND** selecting a continuation does not navigate back to the page of its original attack

#### Scenario: Visible mode and ordinary finger entry
- **WHEN** the editor toolbar auto-hides or the player enters a finger while in Measures mode
- **THEN** the current navigation mode remains visible and finger entry advances by one ordinary editable contact

### Requirement: Contextual editor command ownership
Editor navigation, source/return and reference actions SHALL participate in contextual command binding without taking over text inputs, dialogs, toolbar navigation, binding capture or practice commands. Compatible contexts SHALL permit reuse of the same physical control. Keyboard hints SHALL use undecorated kbd styling, including within selected controls.

#### Scenario: Space outside note editing
- **WHEN** Space is used in a text field, dialog, binding capture or practice
- **THEN** that context retains ownership and the editor navigation mode is not toggled
- **AND** an explicit conflicting user binding is not silently replaced by the default shortcut

#### Scenario: Direction modifiers
- **WHEN** Shift+Tab or a modified arrow is handled during editing
- **THEN** Shift+Tab moves to the previous note and Shift+Right is not misinterpreted as previous merely because Shift is held

### Requirement: A hand press on a folded note is one decision over its passes
A hand press on a folded note SHALL be decided over all the passes it changes, as one decision, whichever pass is applied first. Whether the press gives the note the hand it would show anyway SHALL be read without any pass's own hand, so a hand one pass only carries from another pass of the same press SHALL NOT decide it or make the choice an exception for that pass. A press on a note that is not folded SHALL be decided as before.

#### Scenario: R after L at the first pass, in either order
- **WHEN** the player presses L at bar 10's first right-hand note in No. 13's MusicXML edition, which folds with bar 20, and then R on the folded note, with either pass applied first
- **THEN** neither bar 10 nor bar 20 keeps a hand record, and both show the right hand

#### Scenario: R after L at the second pass only, in either order
- **WHEN** only bar 20 holds the player's left hand, carried back to bar 10, and the player presses R on the folded note, with either pass applied first
- **THEN** neither pass keeps a hand record, and both show the right hand

#### Scenario: R after an edit on the written-out second pass
- **WHEN** the repeat was shown written out and the player gave bar 20's note the left hand and finger 3, and then presses R on the folded note, with either pass applied first
- **THEN** bar 20 keeps finger 3 with no hand of its own, bar 10 keeps nothing, and both show the right hand

### Requirement: A refused hand press leaves a folded repeat folded
When the engraver refuses a hand press on a note of a repeat the reader shows folded, the reader SHALL leave the page as it was before the press: the repeat stays folded, the note keeps the hand it had in every pass, no hand is stored, and the selection stays on the note. The reader SHALL say why the hand can't be drawn and SHALL NOT report the refusal as folded pages that couldn't be drawn. A refused note SHALL return in every pass of the folded note together, even when the refusal names one pass only.

#### Scenario: L on bar 10's first B4 in No. 13
- **WHEN** the player presses L on the first B4 of bar 10 in No. 13's MusicXML edition, shown folded with bar 20, and the engraver can't draw it
- **THEN** the reader says that hand can't be drawn yet, the pages are the same folded pages as before the press, both bars keep the right hand, and no hand is stored

#### Scenario: Both passes carry the player's finger
- **WHEN** both passes of that note carry the player's finger, so L reaches both, and the engraver refuses it
- **THEN** the repeat stays folded, both passes keep the right hand and their fingers, and neither keeps a hand record

#### Scenario: Only the return can't be drawn
- **WHEN** the refusal names only bar 20's note
- **THEN** bar 10 and bar 20 both return to the right hand together, no bar is dropped on its own, and no hand is stored
