# Score tempo

Every score has a piece tempo: how fast the piece should sound. It is counted on the beat the count-in clicks: the dotted beat in compound meters (6/8, 9/8, 12/8), otherwise the meter's denominator. Options → Score shows it, where it came from, and how long the whole piece takes at it. Features that need to know how long something takes to play ask `scoreTempoFor` in `src/main.ts`, or `resolveScoreTempo` in `src/score-tempo.ts`.

The piece tempo is not the practice goal. Practice keeps its own goal in its journal (piano) or its saved reading tempo (reading scores). This feature only reads it. A goal counts only when you have set one: practising toward the edition's reference is not a goal of your own, and a personal goal equal to the reference says nothing more. When you have a goal, and it differs from the piece tempo, Options shows it under the piece tempo, and Hear and set shows both, for example "Piece tempo 88 · practice goal 80". Pressing Enter there keeps the piece tempo; practice keeps its goal, and the dialog and a notice say so. The goal changes in practice Options. When practice opens Hear and set because it has no goal yet, Enter sets both.

## Where the tempo comes from

The first of these that exists wins. None of them is written into the score package.

| Origin | Source | Shown as |
| --- | --- | --- |
| Yours | `preferences.json` → `scoreTempos[entryId]` (`owner-score-tempo-v1`) | Set by you |
| Reference | The edition's `referencePerformanceTempo` | This edition's reference tempo |
| Metronome | A metronome mark at the opening, with its beat unit; it wins over a word at the same place | Metronome mark in the score |
| Encoded | A MusicXML rate with a tempo word (a quarter-note rate) | "Allegro", as the score file plays it |
| Marking | A tempo word at the opening: tempo text, performing instruction or source text | From "Nicht schnell" (not confident: The score says "…", which doesn't settle how fast it goes.) |
| Practice | Only when the score says nothing: the practice goal (read only) | From your practice goal |

The opening is everything before the first barline. With a pickup it also includes the first full bar's downbeat.

A bare encoded number with no word and no unit is often an encoder default. It is never treated as the score's tempo; it is only where hearing starts.

## Marking table

Tempo words in Italian, German, French and English map to quarter-note rates that sit near the middle of the conventional metronome ranges (for example Andante 80, Allegro 132, Nicht schnell 76, Lebhaft 144, Modéré 100, Lively 144). The rates live in `MARKINGS` in `src/score-tempo.ts`.

- **The first tempo word governs.** "Lent et grave" is lent, and "Lebhaft, nicht zu schnell" is lively. At one place the longest phrase wins.
- **Compound markings.** A dash or semicolon starts another section: "Adagio – Allegro ma non troppo" is read from its first section, adagio.
- **Negation and restraint before a word.** Nicht, not, pas or non just before a word names the pace it is not; nicht zu, nicht allzu, not too, pas trop or non troppo a pace short of it. Every word that says fast or slow reads the same way:
  - not fast ("Nicht schnell", "Nicht rasch", "Pas vite") is 76; not too fast ("Nicht zu rasch", "Nicht zu lebhaft", "Sehr innig und nicht zu rasch") is 112;
  - not slow ("Nicht langsam") is 100; not too slow ("Nicht zu langsam", "Pas trop lent") is 76.
  - A negated word too near a moderate pace ("Nicht zu bewegt") says too little: not confident.
- **Moderating first word.** Mässig or moderately just before another word sits between the two (geometric mean): "Mässig langsam" is 76, "Moderately slow" 77, "Mäßig schnell" 124.
- **Modifiers.**
  - Molto, sehr, très and very before a word, or molto and assai after it ("Allegro molto"), move it ×1.1 away from moderate (108).
  - Poco, etwas, un peu and a little move it ×1.05 toward moderate.
  - A later ma non troppo, non molto, nicht zu, pas trop or not too restrains the word it follows by ×1.08: slower when it names a fast word ("Lebhaft, nicht zu schnell" is 133), faster when it names a slow one, otherwise toward moderate ("Adagio ma non troppo" is 71). A restraint that follows a different tempo word ("Adagio, Allegro ma non troppo") cannot be placed on the first: not confident.
  - "Quasi" with a second word sits halfway: "Andante, quasi allegretto" is 96.
- **Beat conversion.** A quarter-note rate converts to the counted beat as `rate × (¼ ÷ beat)^0.6`. Under this rule, compound and alla breve meters count slower beats and short beats count faster, without a separate table per meter.
- **Ignored text.** Words that are not tempo words give nothing: dolce, espressivo, tranquillo, sostenuto, "Leise und sehr egal zu spielen", rit. Character words say how to play, not how fast. Words after the opening give nothing either.

Table values are conventions, not the composer's numbers. They are confident enough to start practice without asking, and Hear and set changes them. A reading whose negation, modifier or restraint cannot be placed, or any other negation word just before the tempo word, is not confident: Hear and set asks, starting from the reading.

## Hear and set

When a score has no confident tempo, starting practice opens Hear and set. Options → Score → Hear and set opens it at any time.

1. A count-in plays. It starts on an accented "1" and runs in whole bars, at least four beats, until the music begins. A pickup lands in its place.
2. The piece then plays from its notes, in performed order (repeats and endings unfolded). Both hands play, with these details:
   - tied notes are held;
   - dynamics and hairpins set loudness, and accents add weight;
   - staccato shortens a note;
   - the sustain pedal holds releases. A key released exactly as the pedal changes is not caught by the new pedal;
   - grace notes sound briefly just before their note;
   - later metronome marks in the score change the speed in proportion. The tempo you set is the opening tempo, and "The whole piece takes about" includes the later tempos.
3. The status shows the printed bar, numbered as the reader numbers it, and the pass through a repeat ("measure 12 of 32 · 2nd time").
4. The score behind the dialog follows the playing bar. It turns to the bar's page and marks the bar lightly, and the dialog moves to the other half of the screen. Closing returns to the page you were reading. The view you saved is never changed.

| Key | Action |
| --- | --- |
| <kbd>←</kbd> <kbd>→</kbd> | Slower / faster along the metronome scale; hold to repeat. The music keeps its place. |
| <kbd>Space</kbd> | Pause, continue, or play again after the end |
| <kbd>Home</kbd> | From the start, with the count-in |
| <kbd>Enter</kbd> | Keep the piece tempo; it is saved as yours. Practice keeps its own goal |
| <kbd>Esc</kbd> | Back; nothing changes |

From Options, both Enter and Esc return to Options with Hear and set focused. If sound cannot start, the dialog says so; ← → still set the tempo, and Enter still saves it. A held arrow stops repeating when the window loses focus.

A score without a meter has no counted beat to hear. Hear and set is unavailable for it, and reading practice asks for a duration and rate, as before.

## Sound

When Piano is on and its output is running, your piano plays the preview: the Salamander bank through the output chosen in Options › Piano. The count-in clicks come from the same native clock (`docs/native-piano-audio.md`, Scheduled notes). The dialog says "Your piano plays this preview."

Otherwise a simple built-in WebAudio piano voice plays it, with the practice metronome click, through the system's default output:

- **Installed but off.** The dialog shows "Your piano is installed and turned off. [Turn on your piano] — stays on, like Options › Piano." The button switches Piano on exactly as Options › Piano does, and Piano stays on afterwards. The preview then continues on your piano from the start.
- **On but not sounding.** The dialog says why, and the built-in voice plays.
- **Cannot start or stops.** If the piano cannot start, the built-in voice takes over and the dialog says why. If it stops while playing, the status says so, and Space plays it again.
- **Browser.** In the browser, which has no native piano, the built-in voice always plays.

The tempo, ← →, Enter and Esc behave the same for both voices. A tempo change on your piano takes effect a few tens of milliseconds ahead, the queued output plus a call allowance. Notes already sounding keep sounding. Pause releases the piano's notes, and continuing has no second count-in. The pedal's effect is folded into each note's release; the native stream does not send pedal controllers yet.
