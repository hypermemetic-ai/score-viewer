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
In note editing, L/R SHALL assign the selected note's effective performing hand as a persistent personal choice, including a choice different from imported hand authority. A hand key SHALL retain its current finger number and selection; finger digits SHALL retain existing advance behavior. The original assignment SHALL remain recoverable. Exact matching recurrences SHALL follow personal-fingering-memory rules; resemblance alone SHALL NOT authorize propagation.

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
