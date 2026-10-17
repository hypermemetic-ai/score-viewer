# Reading and Timed piano practice

Opening a piano passage selects Reading. It stays a selectable mode even when
that passage already has preparation credit or earned progress.

Reading has no beat clock or timing deadline. With a connected piano, genuine
notes advance the existing source-ordered position and adjacent-position steps.
A wrong note keeps the current position available to restart; completing the
last step cycles to the beginning. Reading never earns speed, Done or preparation
credit, and never automatically starts Timed. MIDI identifies pitches and contacts,
not physical fingers. With no piano connected, Reading displays the full source
window for manual reading without assessing notes or advancing automatically.

The selector groups adjacent completed sections into one row under Completed,
with unfinished sections below under Incomplete. Selecting a completed group
shows unfinished Connections first, then its Completed sections and connections.
A group only opens its contents; select an individual exercise to begin.
Incomplete sections also expose their neighboring connections, including those
still locked. Contrasts remain a separate category. Include manual changes the
displayed grouping without changing connection prerequisites or saved progress.
Sections
balance musical boundary evidence with roughly 25 distinct onset positions;
simultaneous chord notes share one sizing onset. This is a practice sizing
heuristic, not a playback tempo or a measured memory limit. Schumann No. 14
normally produces four-measure sections; other sources can produce different
lengths. A connection becomes available when both original sections reach the
target. Connection Reading focuses the two source bars around their boundary;
Timed plays both sections. Connections overlap: first–second, second–third, and so on. New practice
does not build longer recursive joins. Historical joins and their independent
attainment remain retained as recovery evidence.

Contrasts compare the full individual sections, allowing one consistent pitch
transposition. They need at least 75% matching notes and exclude 100% matches.
Each exercise shows two separate source excerpts: a shared cue before a local
divergence and a short continuation through it. Later distinct divergence
episodes remain separate exercises. The player performs A, then B, each with
its own source-meter count-in. It never plays the intervening source measures.
Only the complete successful A/B cycle earns that contrast's own credit; errors
restart at A. Disconnected manual Done likewise requires the complete pair.

Exclude from total removes an exercise only from the displayed total. It keeps
the row, saved progress and eligibility of other exercises intact; Include in
total restores it. Unclaimed X toggles the hovered row, or the selected exercise
when no row is hovered. Saved bindings, editable fields, dialogs and binding
capture keep ownership of X. If every exercise is excluded, the selector says
“No exercises included.” The displayed total weights included exercises equally.

Timed plays the selected section or two-section connection with the existing source-meter count-in,
beat-aligned repeat clock and measured note/hold checks when MIDI is connected.
Fresh piano settings start at 30% for a new passage, 50% for a completed-segment
connection and increase by 2% per successful loop. All present saved starting
speeds, count-in/cooldown settings, custom increments and historical evidence
remain their existing choices. Working speed moves in half-percent steps. Done
appears only in disconnected Timed practice and keeps its existing reversible,
exact-loop eligibility and independent manual/observed evidence.

Practice stays on the selected exercise until you choose another or leave.
Successful Timed loops repeat with the usual speed increase, including when
replaying a previously completed section. Reaching target speed keeps the same
exercise active; newly available connections wait in the selector. Contrasts
cycle A, B, then A again. If a repeat cannot start on time, Resume starts a fresh
count-in for the same selection.

Reading, Timed, Start/Resume, applicable Done and Speed form one compact centered
primary footer group. Speed sits beside the transport rather than at the far right. Mode selection
stops the current transport; Space explicitly starts or resumes the selected
mode. Internal pauses from Options, focus or connection changes keep the selected
mode. Free view shows complete source windows and uses the existing overlapping
four-measure navigation. Space returns from Free view to the previous primary
mode. Contrast practice returns to its paired source excerpts. Selected modes
and excerpt cursors are transient navigation state, not saved musical credit.

The effective defaults are R for Reading, T for Timed and V for Free view. Free view uses this same configurable control in piano and instrument-neutral
manual practice. These controls are configurable in Keys and pedals using the same key/pedal edge, capture and
Test authority as other controls. Existing primary, secondary and local measure
navigation bindings win over unclaimed defaults; explicit empty slots stay empty.
Shift+R rotates in the library, score reader and practice when no saved action owns that modified key. Bare R never rotates. Practice footer controls are shortcut hints and mouse actions;
keyboard navigation does not move focus through them. Left/Right adjust Working
in half-percent steps in Timed and neutral manual transport, using the compact
left-arrow/value/percent/right-arrow control. Free view retains measure navigation,
and Reading retains source-position navigation. Explicit local navigation slots and
other saved owners take priority over the default working arrows. S opens the
Working draft when unclaimed, with one framed control ordered Speed, indicator, then its available S hint; clicking its value
does the same. Typing leaves the sounding and queued speed unchanged until Enter
commits. Escape cancels without leaking Done or Back. An open draft keeps its
value, selection and focus through harmless MIDI or feedback repaints without
committing the draft, including browser change events caused by redraw. Cancelling
a draft after a successful loop restores the current session speed, preserving
that loop’s increase. An explicit
pause cancels it. Leaving the editor uses its existing validated commit behavior.
Enter outside the editor keeps its
existing Done meaning. The readonly integer stays centered in its fixed numeric area; a fractional suffix sits to its right without moving the frame, chevrons, percent or shortcut. The same genuine field supplies the display and remains the sole draft editor. S does not edit speed in Reading or Free view, and the
ordinary reader keeps its existing S scale shortcut. Options and passage selection retain keyboard focus
navigation. Editable fields and modal dialogs keep their own behavior, and held
or repeated mode keys do not trigger fresh starts.

The source fit and footer reserve remain fixed across modes for an unchanged
window. There is no extra preparation/Ready instruction row. Meaningful error,
carry, audio and save feedback uses an existing reserved footer cell with its full
accessible description. Contrast excerpts and Free windows show their actual
source intervals; window changes remain explicit. Free view retains its
four-measure overlap navigation. Responsive footer reserves follow
the fitted surface's logical width, including rotated displays.
The same clean feedback presentation applies to instrument-neutral manual
practice, whose transport, assessment limits and 10% default remain unchanged.

This guide describes source behavior. Automated tests and production-browser
inspection do not certify a particular installed native package, physical MIDI,
pedal, ear latency or a musician's successful re-entry. Historical once-only
preparation and delivery receipts remain in their original validation documents.
The [Reading/Timed source validation record](practice-reading-timed-validation.md)
identifies the exact regression and browser checkpoints separately from delivery.

The current [Speed and shortcut source validation](practice-speed-shortcuts-validation.md)
records the integer-anchor refinement and exact keyboard/build evidence separately
from the earlier Reading/Timed and native delivery receipts.

## Scores without a reference tempo

A piano score without a reference performance tempo (for example Bach's
Goldberg Variation 1, or many imported MusicXML and MuseScore files) asks for
your tempo the first time you open Practice. The tempo counts the opening
meter's beat: the denominator, or the dotted beat in compound meters, the same
beat as the count-in. It is remembered as the personal goal in that score's
practice journal for the selected keyboard, and Options shows it as Your tempo,
where you can change it. Starting, connection and working speeds, each success
increase, section percentages, Best/Done and the totals are percentages of your
tempo. No score reference is shown or offered. The selector and the active
header show Your tempo beside the total. Earned speeds are kept as rates, so
raising your tempo lowers their percentages instead of erasing them. Scores
with a reference tempo are unchanged. Each keyboard and transposition keeps its
own journal, so switching outside Practice asks again; switching while Practice
is open carries the tempo across. Library progress for such a score appears once
a tempo is set and counts toward that tempo.

## Passive viewing and editing

The full-score reader, editor, selector and Free view do not match played notes, highlight matches, advance selection or turn pages automatically. Only section Reading/Timed and their preparation interpret notes. Free view retains physical held-key state for explicit practice re-entry without counting passive-view attacks as successful playing. MIDI reset, focus loss or connection replacement clears that state. Explicit keyboard/pedal commands, independent piano sound and Options diagnostics remain available. The former full-score Performance start and grading controls are retired; existing records remain stored.

In Edit, plain Up/Down move to the horizontally nearest editable note in the previous/next whole system, across either hand. Equal horizontal distances use vertical proximity, then written source order. Empty systems are skipped; score ends keep selection in place. Page crossings reveal and focus the destination note, including a visible held-note continuation. Left/Right/Tab keep their existing chronological movement. Toolbar controls, editable fields, dialogs and binding capture keep ownership of their arrows; modified, repeated or already-held vertical keys do not move the note selection.

The [passive reader and system navigation validation](passive-score-editing-validation.md) records the initial source and actual production-browser checks separately from native delivery.
