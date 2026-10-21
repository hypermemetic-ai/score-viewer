## Context

`.tuna` scores already carry `tempos` (source metronome marks with `sourceUnit`, or an encoded quarter-note rate and description), `sourceTexts` and `performingInstruction` (source words), and an optional `referencePerformanceTempo`. Practice on a score without a reference stores the player's tempo as the journal's `personalGoal`. The optional native piano (Accurate-Salamander V6.2) renders only native MIDI input; the frontend has no command to send it notes, and browser builds have no native audio at all.

## Decisions

### Resolution, not storage in the score

The performance tempo is resolved on demand, first match wins:

1. **yours** — `preferences.scoreTempos[entryId]` (`owner-score-tempo-v1`: bpm, beat, setAt).
2. **practice** — the piano practice journal's `personalGoal`; read only.
3. **reference** — the package's `referencePerformanceTempo`.
4. **metronome** — the first source tempo before the first barline with a printed `sourceUnit`; exact.
5. **encoded** — that tempo's bpm with a source word (MusicXML sound tempo, quarter notes per minute); confident.
6. **marking** — the first opening word (tempo description, performing instruction, source texts before the first barline) found in the marking table; confident.
7. A bare encoded bpm without word or unit may be an encoder default: not confident, only the flow's starting value.

Nothing is written into a package, so revisions, journals, editions and hands are untouched and existing entries gain a tempo without re-import. Owner choices outrank source interpretation; practice goals are never written by this feature.

Owner tempos live in `preferences.json` because the native managed-file allowlist admits no new per-score file kinds without a native release, and preferences are already written whole with unrelated fields preserved. The map is keyed by library entry id, so it survives new editions, transpositions and keyboard layouts.

### Marking table and counted beat

Each table word has a conventional quarter-note rate in a simple meter (e.g. Adagio 66, Andante 80, Allegro 132, Langsam 60, Nicht schnell 76, Mässig 96, Lebhaft 144, Lent 56, Modéré 100, Vif 150, Slow 60, Lively 144). Text is normalised (case, accents, ß, punctuation) and the longest phrase wins, so "Nicht zu schnell" is not read as "Schnell". An intensifier just before the word (molto, sehr, très, very…) moves it 10 % away from a moderate 108; a softener (poco, etwas, un peu, a little…) 5 % toward it; "ma non troppo"/"nicht zu"/"pas trop" after it restrains it 8 %.

The tempo is counted on the beat the count-in clicks (`scoreBeatUnit`: dotted in compound meters, otherwise the denominator). One rule converts the quarter rate to that beat: `rate × (¼ ÷ beat)^0.6` — shorter beats go faster but not proportionally (Allegro 6/8 ≈ dotted quarter 103, alla breve ≈ half 87). Values are rounded starting points, always shown and adjustable.

### Performance schedule

Built from the score's notes in performed order: written-presentation occurrences unfold repeats and endings (dynamics and pedals are mapped through the same occurrences), tied continuations join, note velocity is used when present, else dynamic marks (ppp 30 … fff 118, sf/sfz/fp accents) with hairpins interpolated to the next mark; accents add 14, staccato halves the length; sustain pedal holds releases until the pedal lifts. Count-in: at least four beats in whole bars on the score's beat grid, aligned to a pickup's downbeat, accented on the bar. Grace notes and later tempo changes are not played (one tempo for the piece).

### Sound

The native Salamander cannot be driven from the frontend, so the flow uses a light WebAudio voice (two periodic-wave oscillators per note with register-dependent decay, damped on release) and the practice metronome's click in the same AudioContext, so the count-in and the music share one clock. It works in the browser and in the desktop WebView, through the system default output rather than the native selected output. A lookahead scheduler (350 ms window, 40 ms pump) keeps node counts small; a tempo change re-anchors at the current position, drops not-yet-started sounds and moves sounding notes' releases.

### Keys

The dialog owns ← → (slower/faster on Maelzel's metronome scale 40, 42 … 208, extended 20–300; held keys repeat with the practice tempo cadence), Space (pause/continue/play again), Home (from the start with the count-in), Enter (keep: save as yours) and Esc (leave unchanged). A focused button keeps Enter and Space. Hints use `<kbd>`.

## Risks / Trade-offs

- The built-in voice is a recognisable piano-like tone, not the Salamander. Native playback through the installed bank is separate work (a native command scheduling notes into the existing MIDI/sampler path, Windows/Mac build and ear acceptance).
- Marking values are conventions; a confident marking is used silently but shown in Options with its source word.
- WebAudio uses the default output; on a machine where the native output differs, the preview may come from another device.
- Audible quality, physical output and human tempo acceptance are not verifiable in this environment.
