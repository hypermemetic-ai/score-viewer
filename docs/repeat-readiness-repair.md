# Ordinary repeat readiness repair

The installed repair's complete two-bar count is retained. This follow-up fixes
when an ordinary same-passage repeat is prepared; it does not change source
meter, pulse grids, attack tolerance, output policy or native receipt versions.

## Observed causes

At Viewer `d8a59afe4da15f0c1a5680423c73d37f35d36c14` / ISO
`7205da0d6b62a4a023eda5f2f5d66bdec4fa6493`, the live Chromium component host
reproduced both failure paths with the retained No. 14 source and journal:

- Preparation required every final attack to be matched, although the accepted
  attack window can extend 500 ms beyond its source onset. An accepted final
  attack 220 ms late completed 127 ms after the phrase boundary at 180 dotted
  quarters per minute. The automatic fallback inserted one whole 6/8 bar before
  the intended count.
- A pending serialized progress save suppressed preparation for the following
  repeat. Forty-eight real Working-setting commits, each with a declared
  250 ms write delay, left about 12.23 s of persistence work. The subsequent
  automatic fallback inserted seven whole 6/8 bars before its count.

These are software observations through the production PracticeView,
PracticeClock, source attacks, rendered notation and live WebAudio scheduler.
Events were software injected and storage delays were declared. They are not
installed-app, physical MIDI, native-device or human musical acceptance.

## Musical and authority contract

An ordinary same-passage candidate may be prepared when all earlier onsets are
accepted and only the terminal onset or chord remains undecided. Its projected
transition uses cloned state and the captured playing rate. It cannot prepare a
different passage or grant attainment, Done eligibility or a faster achieved
rate. The old Session and its MIDI clock continue grading until actual
completion. Missing, wrong, extra or early released notes retain their existing
failure behavior and stop the candidate.

Preparation no longer waits for unrelated queued writes. Every existing save
still executes in order; a write failure still stops playback explicitly.
Completion and its actual rate remain authoritative. This change introduces no
save coalescing or journal rewrite.

Once the complete candidate count starts, its BPM, grid and origin are fixed.
Late Working/count edits remain desired settings for the following attempt.
The visible count uses that captured candidate while final grading is pending.
Carry setup, selection, Free view, pause, close, output errors and explicit
cancellation preserve their stop/ownership gates.

A candidate that has not been adopted is guarded at its own score entry by a
bounded timer and independently by frame, MIDI grading and completion paths.
The guard belongs to the exact preparation record, old Session and start
generation. Adoption clears it before installing the new attempt. A stale
callback cannot stop a later attempt. Old-loop evidence already earned before
entry is retained if only acknowledgement remains pending; unresolved grading
at entry cannot award old or future progress.

When preparation or adoption cannot meet this deadline, the same-passage loop
stops in Free view. The message explains that Resume starts a fresh count-in.
It does not automatically reopen the output and append bars. Automatic
different-passage progression retains its existing behavior.

In WebAudio, an unadopted candidate schedules its complete count only. Adoption
immediately schedules the source pulses and requires two audio quanta of lead;
a too-late adoption refuses instead of scheduling a source click in the past.
The native prearmed cue/protocol remains unchanged. A completely blocked
renderer can delay cancellation of already submitted native audio; this patch
does not claim a hard zero-error physical deadline under such a stall.

## Evidence boundaries

Focused controls exercise terminal chords, known earlier misses, captured-rate
projection, persistence backlog, missing/wrong/extra notes, carry loss, queued
rate/count edits, missing acknowledgements, score-entry deadlines, stale timers,
old earned evidence and WebAudio source-entry lead. Real retained-score probes
must separately inspect literal source/page/seat/personal preservation and
actual oscillator times. Final native and human musical acceptance remain
ordinary integration gates owned by the delivery coordinator.
