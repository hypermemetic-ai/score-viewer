## Why

Most imported scores carry no numeric tempo. Practice asks for one through a bare number dialog, and nothing else in the viewer knows how long a passage or the piece takes to play. Every score should have a performance tempo: taken from the composer's marking when it can be interpreted, used without an extra step when that is confident, and otherwise set by ear — a count-in, then the piece playing at the chosen tempo, adjusted from the keyboard until it sounds right.

## What Changes

- Resolve a piece tempo for every score from what already exists, without re-import or changing any score file: the tempo you set, the edition's reference tempo, a printed metronome mark, a number the source encodes beside a tempo word, an opening tempo word interpreted from a marking table (Italian, German, French, English) on the score's counted beat, and otherwise your practice goal.
- Keep the piece tempo and the practice goal distinct and plainly labelled; keeping a piece tempo never changes practice's goal, and the viewer says so.
- Store a tempo you set as owner state: an additive `scoreTempos` map in `preferences.json`, keyed by library entry. It never changes practice journals, progress or other preferences.
- Add a keyboard-first hear-and-set dialog: metronome count-in, then a performance synthesised from the score's notes (both hands, durations, ties, repeats, dynamics, pedal, grace notes, later tempo marks) on a light built-in piano voice; the reader behind it follows the playing bar; ← → change the tempo live on the metronome scale, Space pauses, Home restarts, Enter keeps, Esc leaves.
- Show the tempo, where it came from and the piece's playing time in Options → Score, with Hear and set.
- Practice on a score without a reference or saved practice tempo starts at a confident score tempo without asking; otherwise it opens hear-and-set instead of the number dialog.

## Capabilities

### New Capabilities
- `score-performance-tempo`: score tempo resolution, marking interpretation, owner tempo state and the hear-and-set flow.

### Modified Capabilities
- None. Practice tempo, journals and reference tempos keep their contracts; practice only gains a different way to choose its first tempo.

## Impact

Viewer frontend only (`src/score-tempo.ts`, `src/score-performance.ts`, `src/tempo-audition*.ts`, `src/main.ts`, `src/score-options.ts`, styles). No ISO, score-format, native or managed-file change: `.tuna` already models source tempo marks, tempo words and reference tempos; interpretation is derived and never written back. The installed Salamander piano is native and only sounds for MIDI input; playing a synthesised performance through it needs a native change and is reported as separate work.
