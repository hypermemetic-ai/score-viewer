# Practice repair

When the viewer was extracted into this repository (see [migration](migration.md)), practice had two reported defects:

- consecutive measures in the selection preview and in a practice run were drawn as separate fragments instead of one continuous strip;
- the stems of long notes stayed on the page after their notes were played and removed.

The repair shipped on 2026-10-10 (PRs #56 and #57, then #70 and #72) and has been part of every native delivery since. It made consecutive measures one continuous strip and removes all of a note's ink, long-note stems included, when the note is played. Pause brings the ink back. The same work steadied practice framing, count-ins, speeds, the resume cooldown and keyboard control.

The OpenSpec changes behind it are archived as `2026-10-27-repair-practice-rendering`, `2026-10-27-reuse-cleared-practice-space` and `2026-10-27-repair-practice-stability` under `openspec/changes/archive/`. Their requirements live in the `practice-passage-display` and `practice-refill` specs.

Current practice modes and controls are described in [Reading and Timed practice](practice-reading-timed.md). The application's current state and open work start at [the 2026-10-27 handoff](handoff-2026-10-27.md). The earlier, detailed delivery record of this repair is in this file's git history.
