## ADDED Requirements

### Requirement: Every score has a resolvable performance tempo
The viewer SHALL resolve a score's piece tempo, in order, from the tempo the owner set, the edition's reference performance tempo, a printed source metronome mark, an encoded source rate beside a tempo word, an opening tempo word interpreted from the marking table, and, when the score says nothing confident, the practice goal. The first tempo word at the opening SHALL govern; character words SHALL NOT make a tempo. A negation, restraint or moderating word SHALL apply to the word it stands beside, a compound marking SHALL be read from its first section, and a reading whose negation, modifier or restraint cannot be placed SHALL NOT be confident. It SHALL NOT write a derived tempo into the score package.

#### Scenario: Exact metronome mark
- **WHEN** a score's opening source tempo has a printed beat unit and rate
- **THEN** that mark is the score's tempo and is used without asking

#### Scenario: Negated and moderated words
- **WHEN** a score opens with "Sehr innig und nicht zu rasch", "Nicht rasch", "Mässig langsam" or "Adagio – Allegro ma non troppo"
- **THEN** its tempo is read as not too fast (112), not fast (76), between moderate and slow (76) and adagio (66), never as the fast or later word alone

#### Scenario: A negation that cannot be placed
- **WHEN** a score opens with "Adagio, Allegro ma non troppo" or "Nicht zu bewegt"
- **THEN** the reading is not confident, and features that need a tempo open hear-and-set starting from it

#### Scenario: Confident tempo word
- **WHEN** a score has no numeric tempo and an opening word such as "Nicht schnell", "Andante" or "Lebhaft"
- **THEN** the table rate, counted on the score's beat, is the score's tempo, used without asking and shown with its source word

#### Scenario: Owner choices first
- **WHEN** the owner has set a piece tempo for the score
- **THEN** that tempo outranks anything the score says

#### Scenario: Metronome mark beside a word
- **WHEN** a printed metronome mark and a tempo word share the opening
- **THEN** the metronome mark is the tempo

#### Scenario: Pickup
- **WHEN** a score opens with a pickup and its tempo word stands on the first full bar's downbeat
- **THEN** that word is read as the opening word

#### Scenario: Character words
- **WHEN** the only opening words are character words such as "dolce e tranquillo" or "sempre sostenuto"
- **THEN** the score has no confident tempo

#### Scenario: Nothing usable
- **WHEN** the score has no reference, mark or recognised tempo word
- **THEN** it has no confident tempo, and features that need one open hear-and-set

### Requirement: Piece tempo and practice goal stay distinct
The piece tempo and the practice goal SHALL be shown as two plainly labelled values whenever the owner has set a practice goal that differs from the piece tempo; the edition's reference tempo, or a personal goal equal to it, SHALL NOT be shown as a practice goal. Keeping a piece tempo SHALL NOT change the practice goal, and the viewer SHALL say so when it keeps one.

#### Scenario: Practice already has a goal
- **WHEN** a score with practice goal 80 is heard and set to 88 from Options
- **THEN** the dialog shows "Piece tempo 88 · practice goal 80", Enter saves 88 as the piece tempo, a notice says practice keeps its goal of 80 and where to change it, and Options shows both

#### Scenario: No goal of your own
- **WHEN** a score with an edition reference of 180 and no personal goal (or a personal goal of 180) is heard and set to 168
- **THEN** Options shows only the piece tempo, the dialog says Enter keeps it as the piece tempo, and no notice mentions a practice goal

#### Scenario: Practice has no goal yet
- **WHEN** practice opens hear-and-set because it has no goal
- **THEN** Enter sets the piece tempo and practice remembers the same tempo as its goal

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

#### Scenario: Following the score
- **WHEN** the performance plays
- **THEN** the status names the printed bar and its pass through a repeat, the reader shows the playing bar's page with the bar lightly marked, and closing returns to the owner's page without changing the saved view

#### Scenario: Count-in with a pickup
- **WHEN** the score opens with a pickup
- **THEN** the count-in starts on an accented "1" in whole bars and the pickup lands in place

#### Scenario: No sound available
- **WHEN** audio cannot start
- **THEN** the dialog says so and ← → and Enter still set the tempo

### Requirement: The preview plays on the owner's piano when it is on
Hear-and-set SHALL play the count-in and performance on the native piano through the output selected in Piano settings when Piano is enabled and running, scheduled on the native MIDI clock, and SHALL otherwise use the built-in voice. The dialog SHALL say which voice plays. When Piano is installed but off it SHALL offer to turn it on, saying plainly that it stays on like Options › Piano.

#### Scenario: Piano on
- **WHEN** Piano is enabled and its output is running
- **THEN** the count-in and the notes sound on the piano on one clock, and a tempo change keeps sounding notes and continues from the same place

#### Scenario: Piano installed but off
- **WHEN** the bank is installed and Piano is off
- **THEN** the built-in voice plays and the dialog offers "Turn on your piano — stays on, like Options › Piano"; choosing it enables Piano as the Options switch does and continues on the piano

#### Scenario: Piano cannot start
- **WHEN** the native piano refuses or stops
- **THEN** the built-in voice plays, or the status says the piano stopped, and the reason is shown

### Requirement: Practice uses the score tempo
Piano and reading practice on a score without a reference tempo or saved practice tempo SHALL start at the score's confident tempo without asking, and SHALL otherwise ask through hear-and-set. Saved practice tempos and progress SHALL keep authority.

#### Scenario: Confident marking
- **WHEN** practice starts on a score whose tempo comes from a confident marking and no practice tempo is saved
- **THEN** practice starts at that tempo, as a whole number on the counted beat, and remembers it as the practice goal, as a chosen tempo always was

#### Scenario: No meter
- **WHEN** reading practice needs a first tempo for a score without a meter
- **THEN** it asks for a duration and rate as before, and Options does not offer hear-and-set
