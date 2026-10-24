# Tasks

- [x] 1.1 Index each pitched note's articulation marks (written value, ties, articulation, slurs by voice, graces) and the notes alike in hand, pitch, length and marks.
- [x] 1.2 Count bar places from the downbeat, so pickups line up with the end of a full bar.
- [x] 1.3 Match per hand and local to the moved note: the notes struck with it and its neighbours in that hand, across barlines; the other hand and notes further away are not compared.
- [x] 1.4 Group moves by bar and written hand; record each moved note's reach for the editor.
- [x] 1.5 Unit tests: the other hand differing still matches; differing pitch, duration, written value, staccato, accent or slur blocks; each hand's moves reach that hand's returns; an explicit edit at a return wins; undo removes the copies; full return tables for No. 13 (both forms) and No. 30.
- [x] 1.6 End to end: a move in No. 13's first time through is drawn at its written-out returns, and the stored records are unchanged.
- [x] 1.7 Timings against main at open and per move.
- [x] 1.8 A hand press that gives a note the hand it would show anyway stores nothing; L, then R, on a folded repeat leaves the stored records as they were.
- [x] 1.9 Unit tests: a difference further away still matches; the moved note differing refuses; chord tones struck with the note count.
- [x] 1.10 One matching neighbour is enough: one side differing still matches, both sides differing refuses; a missing side never matches, so the opening pickup is decided by the note after it.
