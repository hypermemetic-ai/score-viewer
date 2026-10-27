# Spec Delta

## ADDED Requirements

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
