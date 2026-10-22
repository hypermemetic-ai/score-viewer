## Context

`.tuna` scores already carry `tempos` (source metronome marks with `sourceUnit`, or an encoded quarter-note rate and description), `sourceTexts` and `performingInstruction` (source words), and an optional `referencePerformanceTempo`. Practice on a score without a reference stores the player's tempo as the journal's `personalGoal`. The optional native piano (Accurate-Salamander V6.2) rendered only native MIDI input; this change adds commands that schedule notes into it from the frontend. Browser builds have no native audio at all.

## Decisions

### Resolution, not storage in the score

The performance tempo is resolved on demand, first match wins:

1. **yours** — `preferences.scoreTempos[entryId]` (`owner-score-tempo-v1`: bpm, beat, setAt).
2. **reference** — the package's `referencePerformanceTempo`.
3. **metronome** — an opening source tempo with a printed `sourceUnit`; exact, and it wins over a word at the same tick.
4. **encoded** — an opening bpm with a source word (MusicXML sound tempo, quarter notes per minute); confident.
5. **marking** — the first opening word (tempo descriptions, performing instruction, opening source texts) found in the marking table; confident unless a negation, modifier or restraint cannot be placed.
6. **practice** — only when the score says nothing confident: the practice goal you set (the piano journal's `personalGoal` unless it equals the edition's reference, or reading practice's saved tempo); read only.
7. A bare encoded bpm without word or unit may be an encoder default: not confident, only the flow's starting value.

The opening is the source before the first barline; with a pickup it reaches the first full bar's downbeat.

Nothing is written into a package, so revisions, journals, editions and hands are untouched and existing entries gain a tempo without re-import. Practice goals are never written by this feature.

### Piece tempo and practice goal

Two notions stay distinct and plainly labelled. The **piece tempo** is what the piece should sound like (Options "Tempo", hear-and-set). The **practice goal** is the journal's target; this feature never changes it. When you have set a practice goal (the edition's reference, or a personal goal equal to it, is not one), and it differs from the piece tempo, Options shows "Practice goal" under the piece tempo, and the dialog shows "Piece tempo N · practice goal M". Enter keeps the piece tempo; the dialog's help and a notice say that practice keeps its goal and that it changes in practice Options. When practice opens the flow because it has no goal yet, Enter sets both: the piece tempo is saved, and practice remembers the chosen tempo as its goal as it always did. Tempos converted to another beat are rounded to whole numbers.

Owner tempos live in `preferences.json` because the native managed-file allowlist admits no new per-score file kinds without a native release, and preferences are already written whole with unrelated fields preserved. The map is keyed by library entry id, so it survives new editions, transpositions and keyboard layouts.

### Marking table and counted beat

Each table word has a conventional quarter-note rate in a simple meter (e.g. Adagio 66, Andante 80, Allegro 132, Langsam 60, Nicht schnell 76, Mässig 96, Lebhaft 144, Lent 56, Modéré 100, Vif 150, Slow 60, Lively 144). Text is normalised (case, accents, ß, punctuation). A dash or semicolon separates sections of a compound marking; the first section that names a tempo is read ("Adagio – Allegro ma non troppo" is adagio). The earliest table phrase governs; at one place the longest wins, and "Lent et grave" is lent. A negation just before a word (nicht, not, pas, non) names the pace it is not, and a restraint (nicht zu, nicht allzu, not too, pas trop, non troppo) a pace short of it, the same for every fast or slow word: not fast 76, not too fast 112, not slow 100, not too slow 76; a negated word between 92 and 126 says too little and is not confident. Mässig/moderately just before another word takes the geometric mean of the two ("Mässig langsam" 76). An intensifier just before the word (molto, sehr, très, very…) or molto/assai just after it moves it 10 % away from a moderate 108; a softener (poco, etwas, un peu, a little…) 5 % toward it; a later "ma non troppo"/"non molto"/"nicht zu"/"pas trop"/"not too", or a later negated tempo word, restrains the word it follows 8 % (slower when it names a fast word, faster when it names a slow one, otherwise toward moderate); one that follows another tempo word cannot be placed and makes the reading not confident, as does any other negation word just before the tempo word; "quasi" with a second word takes the midpoint. Character words (tranquillo, sostenuto, dolce…) are not tempo words.

The tempo is counted on the beat the count-in clicks (`scoreBeatUnit`: dotted in compound meters, otherwise the denominator). One rule converts the quarter rate to that beat: `rate × (¼ ÷ beat)^0.6` — shorter beats go faster but not proportionally (Allegro 6/8 ≈ dotted quarter 103, alla breve ≈ half 87). Values are rounded starting points, always shown and adjustable.

### Performance schedule

Built from the score's notes in performed order: written-presentation occurrences unfold repeats and endings (dynamics, pedals, grace notes and tempo marks are mapped through the same occurrences), tied continuations join, note velocity is used when present, else dynamic marks (ppp 30 … fff 118, sf/sfz/fp accents) with hairpins interpolated to the next mark; accents add 14, staccato halves the length; sustain pedal holds releases until the pedal lifts (a release exactly at a pedal change is not caught). Grace notes sound before their host, a 32nd of a quarter each, 8 softer. Later numeric tempo marks become factors of the opening tempo; the clock and the playing time follow them, and a repeat returns to the tempo in force at its bar. Count-in: starts on an accented "1" in whole bars, at least four beats, and runs until the music begins, so a pickup lands in place. Each performed bar carries its written bar (as the reader numbers it) and pass, for the status line and for following the score.

### Sound

When Piano is enabled and its output is running, the preview plays on the native Salamander through the selected output (`NativeTempoAudition`). The performance and count-in become one tick-ordered event stream: lifts before attacks and clicks between them at one tick, and a pedal-held re-strike lifts once at the later release. Ticks are mapped to native MIDI-clock instants and sent in chunks of at most 512 events, 1.5 s ahead, with a 100 ms pump. Native calls run one at a time. Each receipt gives the native clock and the lead, the earliest on-time instant. A start or resume replaces and releases the stream from lead + 30 ms. A tempo change replaces it with `keepUntil` at that cut: sounding notes keep sounding, the old stream's later events are dropped, and the new events follow from the tick the old stream reaches at the cut. Pause releases. Status and the followed bar use the mapping in force at the clock, so the place is kept. "Too soon" (a cut, or a fresh stream's first event, the output has passed) retries once with a fresh lead. Any other failure stops the preview, releases what it scheduled, and the status says why; a stall, replacement or late stream reads "The piano lost its place". Native constraints and the queue/epoch design are in `docs/native-piano-audio.md`.

The dialog names the voice. It opens at once: with Piano on, the voice comes from the audio status, which is only read. With Piano off, `piano_bank_present` reads the bank pointer and manifest without hashing (the session's verified answer when it has one), and the offer "[Turn on your piano] It stays on; turn it off in Options › Piano." joins the open dialog when it answers. The button is that switch: it is persistent and saved in Piano settings, but only once the output sounds; otherwise the piano returns to how it was. If the piano cannot start, the built-in voice takes over and the dialog says why.

Otherwise the flow uses a light WebAudio voice (two periodic-wave oscillators per note with register-dependent decay, damped on release) and the practice metronome's click in the same AudioContext, so the count-in and the music share one clock. It works in the browser and in the desktop WebView, through the system default output rather than the native selected output. A lookahead scheduler (350 ms window, 40 ms pump) keeps node counts small; a tempo change re-anchors at the current position, drops not-yet-started sounds and moves sounding notes' releases.

### Keys

The dialog owns ← → (slower/faster on Maelzel's metronome scale 40, 42 … 208, extended 20–300; held keys repeat with the practice tempo cadence and stop when the window loses focus), Space (pause/continue/play again), Home (from the start with the count-in), Enter (keep: save as yours) and Esc (leave unchanged). A focused button keeps Enter and Space. Hints use `<kbd>`.

### Following the score

While it plays, the reader turns to the playing bar's page (a transient page override in `renderPages`; the owner's saved view is never changed) and marks the bar with a light rectangle behind the ink, from the bar's seats. The dialog moves to the half of the screen away from the bar (rotation-aware `fitDialog` placement). Closing removes the mark and shows the owner's page again. Reading scores without seats are not followed.

### Scores without a meter

They have no counted beat: Options disables Hear and set, and reading practice keeps the earlier duration-and-rate chooser.

## Risks / Trade-offs

- The built-in voice is a recognisable piano-like tone, not the Salamander; it plays when Piano is off, not sounding, or in the browser.
- Native scheduled instants are when frames leave the mixer; output latency is not included, so on a high-latency output the piano sounds later than its clock. This is consistent across the count-in and the music.
- If the output stalls for more than half a second around a tempo change, the boundary note can sound twice or not at all; late attacks (> 50 ms) are dropped rather than played out of time.
- The pedal is folded into note releases; the native stream accepts controllers, but the preview does not send pedal yet.
- The native path is compiled and tested on the portable core only here; Windows/macOS host builds, audible timing and ear acceptance need the paired native build.
- Marking values are conventions; a confident marking is used silently but shown in Options with its source word.
- WebAudio uses the default output; on a machine where the native output differs, the preview may come from another device.
- Audible quality, physical output and human tempo acceptance are not verifiable in this environment.
