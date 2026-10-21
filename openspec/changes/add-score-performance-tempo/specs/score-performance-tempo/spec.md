## ADDED Requirements

### Requirement: Every score has a resolvable performance tempo
The viewer SHALL resolve a score's performance tempo, in order, from the tempo the owner set, the owner's practice tempo, the edition's reference performance tempo, a printed source metronome mark, an encoded source rate beside a tempo word, and an opening tempo word interpreted from the marking table. It SHALL NOT write a derived tempo into the score package.

#### Scenario: Exact metronome mark
- **WHEN** a score's opening source tempo has a printed beat unit and rate
- **THEN** that mark is the score's tempo and is used without asking

#### Scenario: Confident tempo word
- **WHEN** a score has no numeric tempo and an opening word such as "Nicht schnell", "Andante" or "Lebhaft"
- **THEN** the table rate, counted on the score's beat, is the score's tempo, used without asking and shown with its source word

#### Scenario: Owner choices first
- **WHEN** the owner has set a tempo or has a practice tempo for the score
- **THEN** that tempo outranks anything the score says

#### Scenario: Nothing usable
- **WHEN** the score has no reference, mark or recognised tempo word
- **THEN** it has no confident tempo, and features that need one open hear-and-set

### Requirement: Owner tempo is owner state
A tempo set by the owner SHALL be stored only in the additive `scoreTempos` preferences map keyed by library entry, preserving every other preference, and SHALL NOT change practice journals, progress, scores, fingerings, hands or the library.

#### Scenario: Existing data
- **WHEN** existing scores open after this change
- **THEN** no file is written, and practice tempos and progress read exactly as before

#### Scenario: Setting a tempo
- **WHEN** the owner keeps a tempo in hear-and-set
- **THEN** only `preferences.json` gains or updates that entry's `scoreTempos` record

### Requirement: Hear and set by keyboard
Hear-and-set SHALL play a metronome count-in and then a performance synthesised from the score's notes at the chosen tempo, let ← → change the tempo while it plays, Space pause and continue, Home restart, Enter keep it and Esc leave everything unchanged. It SHALL be reachable from Options → Score and SHALL replace the practice number dialog when practice needs a first tempo.

#### Scenario: Live adjustment
- **WHEN** the owner presses → during the performance
- **THEN** the tempo moves to the next metronome-scale value and the music continues from its current place at the new tempo

#### Scenario: Leave unchanged
- **WHEN** the owner presses Esc
- **THEN** sound stops and nothing is saved

#### Scenario: No sound available
- **WHEN** audio cannot start
- **THEN** the dialog says so and ← → and Enter still set the tempo

### Requirement: Practice uses the score tempo
Piano and reading practice on a score without a reference tempo or saved practice tempo SHALL start at the score's confident tempo without asking, and SHALL otherwise ask through hear-and-set. Saved practice tempos and progress SHALL keep authority.

#### Scenario: Confident marking
- **WHEN** practice starts on a score whose tempo comes from a confident marking and no practice tempo is saved
- **THEN** practice starts at that tempo and remembers it as the practice goal, as a chosen tempo always was
