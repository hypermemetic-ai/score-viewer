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

A joined passage is available once its original source segments reach the
performance target. Joined Reading cycles the real boundary pairs: for example,
a 1–16 join has measures 4–5, 8–9 and 12–13. A small `1/3` counter in the notation's
top-right corner identifies the current join; its accessible label includes the
measure range. Previous/next controls can browse joins while stopped. A rest-only
join also stays browsable while started, because no invented note can advance it.
Existing saved joins and their independent attainment remain retained.

Timed plays the whole selected passage with the existing source-meter count-in,
beat-aligned repeat clock and measured note/hold checks when MIDI is connected.
Fresh piano settings start at 30% for a new passage, 50% for a completed-segment
connection and increase by 2% per successful loop. All present saved starting
speeds, count-in/cooldown settings, custom increments and historical evidence
remain their existing choices. Working speed moves in half-percent steps. Done
appears only in disconnected Timed practice and keeps its existing reversible,
exact-loop eligibility and independent manual/observed evidence.

Reading, Timed, Start/Resume, applicable Done and Speed form one compact centered
primary footer group. Speed sits beside the transport rather than at the far right. Mode selection
stops the current transport; Space explicitly starts or resumes the selected
mode. Internal pauses from Options, focus or connection changes keep the selected
mode. Free view shows complete source windows and uses the existing overlapping
four-measure navigation. Space returns from Free view to the previous primary
mode; joined Reading resumes its same join cursor. The selected mode and join
cursor are transient navigation state, not saved musical credit.

The effective defaults are R for Reading, T for Timed and V for Free view. Free view uses this same configurable control in piano and instrument-neutral
manual practice. These controls are configurable in Keys and pedals using the same key/pedal edge, capture and
Test authority as other controls. Existing primary, secondary and local measure
navigation bindings win over unclaimed defaults; explicit empty slots stay empty.
Shift+R rotates in the library, score reader and practice when no saved action owns that modified key. Bare R never rotates. Practice footer controls are shortcut hints and mouse actions;
keyboard navigation does not move focus through them. Left/Right adjust Working
in half-percent steps in Timed and neutral manual transport, using the compact
left-arrow/value/percent/right-arrow control. Free view retains measure navigation,
and Reading retains its join navigation. Explicit local navigation slots and
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
accessible description. Joined two-measure Reading and different Free windows
intentionally show different source intervals; their window changes are explicit. Entering Free view from a join opens the
four-measure overlap around that boundary, rather than treating Reading's drawing
reservations as a live Timed reading anchor. Responsive footer reserves follow
the fitted surface's logical width, including rotated displays.
The same clean feedback presentation applies to instrument-neutral manual
practice, whose transport, assessment limits and 10% default remain unchanged.

This guide describes source behavior. Automated tests and production-browser
inspection do not certify a particular installed native package, physical MIDI,
pedal, ear latency or a musician's successful re-entry. Historical once-only
preparation and delivery receipts remain in their original validation documents.

The current [Speed and shortcut source validation](practice-speed-shortcuts-validation.md)
records the integer-anchor refinement and exact keyboard/build evidence separately
from the earlier Reading/Timed and native delivery receipts.
