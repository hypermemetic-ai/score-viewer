# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
