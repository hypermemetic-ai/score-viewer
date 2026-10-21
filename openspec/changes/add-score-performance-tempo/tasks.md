## 1. Model

- [x] 1.1 Resolve score tempos from owner state, practice goals, references, metronome marks, encoded rates and the marking table, counted on the score's beat.
- [x] 1.2 Store owner tempos additively in preferences; never write packages or journals.

## 2. Performance

- [x] 2.1 Build performed-order schedules with repeats, ties, velocities/dynamics/hairpins, articulations, pedal and a pickup-aware count-in.
- [x] 2.2 Play the count-in and performance on one WebAudio clock with live re-timing.

## 3. Interface

- [x] 3.1 Add the hear-and-set dialog with ← → Space Home Enter Esc and `<kbd>` hints.
- [x] 3.2 Show the tempo, its origin and playing time in Options → Score with Hear and set.
- [x] 3.3 Start piano and reading practice at a confident score tempo, else through hear-and-set.

## 4. Verification

- [x] 4.1 Unit tests for marking interpretation, resolution, owner records, schedules and audition timing.
- [x] 4.2 Build, full tests and type checks.
- [x] 4.3 Rehearse every owner score on a copy of the owner data; confirm practice tempos/progress unchanged; run the flow by keyboard; inspect screenshots.
- [ ] 4.4 Owner listening acceptance on the desktop app (audible quality, output device, marking values).
- [ ] 4.5 Native Salamander playback of the performance (separate native change).
