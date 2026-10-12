# Calibration interface

The new effort screen presents the accepted combined press and alternating task, keeping all five descriptions visible alongside the actual two physical contacts. Main, placement setup, ratings, review and Options are separate pages. Fingertip readings retain their independent controller and drafts. Calibration input is admitted by page; a MIDI rating note already held on setup or measurement must be released before it can grade a trial. Keyboard diagrams use a stable physical scale for each instrument, with connected Jankó bodies and one level boundary. Note names and key colors are independent saved presentation choices.

URW Gothic Book supplies the accepted regular text alongside the existing Demi font. `src/URWGothic-Book.otf` is 82,968 bytes, SHA-256 `04318316cee29950805110c9c8949eea189ef5575132881f4d4d7e03e5299903`, verified byte-for-byte against [ArtifexSoftware/urw-base35-fonts](https://github.com/ArtifexSoftware/urw-base35-fonts/blob/c15105598aa7eb256b1ebfcecd3d078801521e73/fonts/URWGothic-Book.otf), tag `20200910`, commit `c15105598aa7eb256b1ebfcecd3d078801521e73`. The font is unmodified and bundled locally. The existing `licenses/URW-LICENSE`, `licenses/URW-COPYING` and `licenses/URW-base35-provenance.md` retain the full upstream notices, attribution and source pointers; their bytes are unchanged.

## Global notation and calibration entry

The left-aligned Calibrate command opens calibration from Options → Fingerings and returns to that section on Back. The former Hands section is replaced by the global Notation section. ISO is currently the available notation system; Traditional is visibly unavailable until regular sheet music is supported. Calibration Options reflects the same global restriction, while physical key colors remain independent.

The global setting uses the additive `notationSystem` preference. Existing `calibrationNoteNames` bytes remain retained with other preferences; they do not enable an unavailable global notation system. No saved reading, effort grade, score or fingering is converted by this interface change. Native delivery of an earlier revision is separate from this source preview.

## Calibration menu

The main menu uses a compact panel with aligned command rows and a labeled effort count. Continue has initial focus. Arrow keys select enabled commands, Enter opens the selected command, and F, R, E and O directly open fingertip readings, rating review, export and Options. Disabled commands remain unavailable by shortcut. Menu navigation uses the shared Options navigator only on the main page; measurement selectors and rating input retain their existing keyboard behavior. Focus returns to the chosen menu command when leaving a subpage, including after starting or resuming effort work.
