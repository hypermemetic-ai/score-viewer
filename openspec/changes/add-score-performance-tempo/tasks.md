## 1. Model

- [x] 1.1 Resolve score tempos from owner state, practice goals, references, metronome marks, encoded rates and the marking table, counted on the score's beat.
- [x] 1.2 Store owner tempos additively in preferences; never write packages or journals.
- [x] 1.3 Keep the piece tempo and the practice goal distinct; show both and say what Enter keeps.
- [x] 1.4 Read the first opening tempo word with following modifiers, quasi and restraint; ignore character words; include a pickup's first full downbeat; a metronome mark wins at its tick.
- [x] 1.5 Place a negation, restraint or moderating word on the word it stands beside; read a compound marking from its first section; make a reading that cannot be placed not confident (review round 2).
- [x] 1.6 Show a practice goal only when the owner has set one that differs from the reference and the piece tempo; match the Enter notice; proper ordinals (review round 2).

## 2. Performance

- [x] 2.1 Build performed-order schedules with repeats, ties, velocities/dynamics/hairpins, articulations, pedal and a pickup-aware count-in.
- [x] 2.2 Play the count-in and performance on one WebAudio clock with live re-timing.
- [x] 2.3 Release a note at a pedal change; count in from an accented 1 before a pickup; play grace notes; follow later tempo marks in playback and playing time.

## 3. Interface

- [x] 3.1 Add the hear-and-set dialog with ← → Space Home Enter Esc and `<kbd>` hints.
- [x] 3.2 Show the tempo, its origin and playing time in Options → Score with Hear and set.
- [x] 3.3 Start piano and reading practice at a confident score tempo, else through hear-and-set; keep the duration chooser for scores without a meter.
- [x] 3.4 Show printed bars and passes; follow the playing bar in the reader and restore the owner's page on close.

## 4. Verification

- [x] 4.1 Unit tests for marking interpretation, resolution, owner records, schedules and audition timing.
- [x] 4.2 Build, full tests and type checks.
- [x] 4.3 Rehearse every score on a private data copy; confirm practice tempos/progress unchanged; run the flow by keyboard; inspect screenshots.
- [ ] 4.4 Owner listening acceptance on the desktop app (audible quality, output device, marking values).
- [x] 4.5 Native Salamander playback of the performance: scheduled note/click stream on the native clock through the selected output, with tempo-change cuts, release and backpressure; the dialog names the voice and offers the persistent Piano switch; built-in fallback. Portable-core Rust tests (including the allocator test) and frontend tests.
- [x] 4.6 Native build on Windows/macOS. Evidence: the native preview merged in #174 and is in the 2026-10-27 delivery 956bbe66 (#208), which seals app db86351 on ISO 3bbe6a96; paired native run 40577544036 succeeded for Windows x64 and universal Mac, and the Windows build is installed (docs/handoff-2026-10-27.md).
- [ ] 4.7 Owner listening acceptance of the native preview (timing, latency, count-in alignment, tempo changes).
