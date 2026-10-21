# Score tempo

Every score has a performance tempo, counted on the beat the count-in clicks: the dotted beat in compound meters (6/8, 9/8, 12/8), otherwise the meter's denominator. Options → Score shows it, where it came from, and how long the whole piece takes at it. Features that need to know how long something takes to play ask `scoreTempoFor` in `src/main.ts`, or `resolveScoreTempo` in `src/score-tempo.ts`.

## Where the tempo comes from

The first of these that exists wins. None of them is written into the score package.

| Origin | Source | Shown as |
| --- | --- | --- |
| Yours | `preferences.json` → `scoreTempos[entryId]` (`owner-score-tempo-v1`) | Set by you |
| Practice | The practice journal's personal goal (read only) | Your practice tempo |
| Reference | The edition's `referencePerformanceTempo` | This edition's reference tempo |
| Metronome | A metronome mark before the first barline, with its beat unit | Metronome mark in the score |
| Encoded | A MusicXML rate with a tempo word (a quarter-note rate) | "Allegro", as the score file plays it |
| Marking | A tempo word at the opening: tempo text, performing instruction or source text | From "Nicht schnell" |

A bare encoded number with no word and no unit is often an encoder default. It is never treated as the score's tempo; it is only where hearing starts.

## Marking table

Tempo words in Italian, German, French and English map to quarter-note rates that sit near the middle of the conventional metronome ranges (for example Andante 80, Allegro 132, Nicht schnell 76, Lebhaft 144, Modéré 100, Lively 144). The rates live in `MARKINGS` in `src/score-tempo.ts`.

- **Longest phrase wins.** "Nicht zu schnell" is read as not too fast, not as fast.
- **Modifiers.**
  - Molto, sehr, très and very move a word ×1.1 away from moderate (108).
  - Poco, etwas, un peu and a little move it ×1.05 toward moderate.
  - A trailing ma non troppo, aber nicht zu, mais pas trop or but not too softens a word by ×1.08.
- **Beat conversion.** A quarter-note rate converts to the counted beat as `rate × (¼ ÷ beat)^0.6`. Under this rule, compound and alla breve meters count slower beats and short beats count faster, without a separate table per meter.
- **Ignored text.** Words that are not tempo words give nothing: dolce, espressivo, "Leise und sehr egal zu spielen", rit. Neither do words after the first barline.

Table values are conventions, not the composer's numbers. They are confident enough to start practice without asking, and Hear and set changes them.

## Hear and set

When a score has no confident tempo, starting practice opens Hear and set. Options → Score → Hear and set opens it at any time.

1. A count-in plays: at least four beats in whole bars, accented on the bar, aligned so that a pickup falls in its place.
2. The piece then plays from its notes, in performed order (repeats and endings unfolded). Both hands play, with these details:
   - tied notes are held;
   - dynamics and hairpins set loudness, and accents add weight;
   - staccato shortens a note;
   - the sustain pedal holds releases.

| Key | Action |
| --- | --- |
| <kbd>←</kbd> <kbd>→</kbd> | Slower / faster along the metronome scale; hold to repeat. The music keeps its place. |
| <kbd>Space</kbd> | Pause, continue, or play again after the end |
| <kbd>Home</kbd> | From the start, with the count-in |
| <kbd>Enter</kbd> | Keep the tempo; it is saved as yours |
| <kbd>Esc</kbd> | Back; nothing changes |

From Options, both Enter and Esc return to Options with Hear and set focused. If sound cannot start, the dialog says so; ← → still set the tempo, and Enter still saves it.

## Sound

The preview plays on a simple built-in WebAudio piano voice with the practice metronome click, through the system's default output. The optional native Salamander piano (`docs/native-piano-audio.md`) does not play it yet. Native playback needs the Rust audio engine to accept a scheduled note stream from the frontend, which is a separate native change.
