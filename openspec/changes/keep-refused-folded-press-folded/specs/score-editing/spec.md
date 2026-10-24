# Spec Delta

## ADDED Requirements

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
