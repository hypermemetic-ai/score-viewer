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

#### Scenario: Local choice, only here and reset
- **WHEN** the player presses L at bar 21's carried E4, or chooses Only here at bar 11
- **THEN** that note or bar keeps its own hand, while the other bar keeps its own effective hand
- **AND** Use bar 11's hand or Use for matching bars returns to the shared hand, and choosing the written hand at bar 11 undoes the change in both bars

#### Scenario: Practice follows the page
- **WHEN** bar 21 takes bar 11's right hand
- **THEN** practice, Fingers and calculator requests use the right hand for bar 21's E4 and D#4, and an exception made there wins

#### Scenario: Undrawable recurrence
- **WHEN** a matching bar would be left with a key that is half without a hand
- **THEN** that bar keeps its hands, the player is told which bar and why, and the change itself is saved
