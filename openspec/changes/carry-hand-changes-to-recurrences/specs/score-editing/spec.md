# Spec Delta

## MODIFIED Requirements

### Requirement: Direct personal hand and finger decisions
In note editing, L/R SHALL assign the selected note's effective performing hand as a persistent personal choice, including a choice different from imported hand authority. A hand key SHALL retain its current finger number and selection; finger digits SHALL retain existing advance behavior. The original assignment SHALL remain recoverable. Exact matching recurrences SHALL follow personal-fingering-memory rules; resemblance alone SHALL NOT authorize propagation. A deliberate hand choice SHALL also apply, without being stored there, to other bars of the score whose notes in both hands, with written hands, pitches, relative onsets and durations, are identical from the downbeat to the end of the shorter bar.

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
- **WHEN** the player moves Schumann Op. 68 No. 13 bar 11's LH E4 and D#4 to the right hand
- **THEN** bar 21's E4 and D#4 are also right-hand notes, and the editor names bar 11 as their source
- **AND** no record is written for bar 21, and the bass notes and every other note keep their hands
- **AND** a bar with another bass under the same chords is not changed

#### Scenario: Keep, don't share and reset, note by note
- **WHEN** the player presses L or Keep its written LH at bar 21's carried E4, or Don't share this note's hand at bar 11's E4
- **THEN** that note keeps its own hand, the other bar's E4 keeps its own effective hand, and bar 21's D#4 still follows bar 11
- **AND** the notice names the note and what happened to it before the bars it changed
- **AND** Use bar 11's hand or Share this note's hand returns to the shared hand, and choosing the written hand at bar 11 undoes the change in both bars

#### Scenario: A move in bar 11's pickup
- **WHEN** the player also moves bar 11's pickup B4, after the stretch bar 21 plays
- **THEN** bar 11's E4 and D#4 still reach bar 21, and the pickup's hand stays in bar 11

#### Scenario: Pickup bars
- **WHEN** a hand is moved in a pickup bar, or in a full bar that starts with the same notes
- **THEN** it reaches only pickup bars of the same length, never a full bar's downbeat

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
