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

Reading, Timed and Start/Resume form the primary footer group. Mode selection
stops the current transport; Space explicitly starts or resumes the selected
mode. Internal pauses from Options, focus or connection changes keep the selected
mode. Free view shows complete source windows and uses the existing overlapping
four-measure navigation. Space returns from Free view to the previous primary
mode; joined Reading resumes its same join cursor. The selected mode and join
cursor are transient navigation state, not saved musical credit.

The effective defaults are U for Reading, T for Timed and V for Free view. Free view uses this same configurable control in piano and instrument-neutral
manual practice. These controls are configurable in Keys and pedals using the same key/pedal edge, capture and
Test authority as other controls. Existing primary, secondary and local measure
navigation bindings win over unclaimed defaults; explicit empty slots stay empty.
R retains rotation. Up/Down adjust Working only in Timed. Editable fields and
modal dialogs keep their own keyboard behavior, and held/repeated mode keys do
not trigger fresh starts.

The source fit and footer reserve remain fixed across modes for an unchanged
window. There is no extra preparation/Ready instruction row. Meaningful error,
carry, audio and save feedback uses an existing reserved footer cell with its full
accessible description. Joined two-measure Reading and different Free windows
intentionally show different source intervals; their window changes are explicit.
The same clean feedback presentation applies to instrument-neutral manual
practice, whose transport, assessment limits and 10% default remain unchanged.

This guide describes source behavior. Automated tests and production-browser
inspection do not certify a particular installed native package, physical MIDI,
pedal, ear latency or a musician's successful re-entry. Historical once-only
preparation and delivery receipts remain in their original validation documents.

The focused native-source port starts from the delivered Viewer `37aecb0c` and
retains ISO `7205da0d`, all native audio, piano, package and lockfile inputs. It
contains the piano Reading/Timed controls and shared Free-view binding authority;
the main branch's instrument-neutral practice, GP intake and TAB rendering stay
outside this port. Its source review and browser evidence precede a separate
paired native build and recipient review. The currently installed build remains
the one identified by its delivery receipt until that later activation completes.
