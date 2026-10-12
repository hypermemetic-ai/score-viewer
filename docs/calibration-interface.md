# Calibration interface

The new effort screen presents the accepted combined press and alternating task, keeping all five descriptions visible alongside the actual two physical contacts. Main, placement setup, ratings, review and Options are separate pages. Fingertip readings retain their independent controller and drafts. Calibration input is admitted by page; a MIDI rating note already held on setup or measurement must be released before it can grade a trial. Keyboard diagrams use a stable physical scale for each instrument, with connected Jankó bodies and one level boundary. Note names and key colors are independent saved presentation choices.

URW Gothic Book supplies the accepted regular text alongside the existing Demi font. `src/URWGothic-Book.otf` is 82,968 bytes, SHA-256 `04318316cee29950805110c9c8949eea189ef5575132881f4d4d7e03e5299903`, verified byte-for-byte against [ArtifexSoftware/urw-base35-fonts](https://github.com/ArtifexSoftware/urw-base35-fonts/blob/c15105598aa7eb256b1ebfcecd3d078801521e73/fonts/URWGothic-Book.otf), tag `20200910`, commit `c15105598aa7eb256b1ebfcecd3d078801521e73`. The font is unmodified and bundled locally. The existing `licenses/URW-LICENSE`, `licenses/URW-COPYING` and `licenses/URW-base35-provenance.md` retain the full upstream notices, attribution and source pointers; their bytes are unchanged.

## Global notation and calibration entry

The left-aligned Calibrate command opens calibration from Options → Fingerings and returns to that section on Back. The former Hands section is replaced by the global Notation section. ISO is currently the available notation system; Traditional is visibly unavailable until regular sheet music is supported. Calibration Options reflects the same global restriction, while physical key colors remain independent.

The global setting uses the additive `notationSystem` preference. Existing `calibrationNoteNames` bytes remain retained with other preferences; they do not enable an unavailable global notation system. No saved reading, effort grade, score or fingering is converted by this interface change. Native delivery of an earlier revision is separate from this source preview.

## Calibration menu

Back occupies the bottom left and Options the bottom right of the active screen or dialog throughout the application. Existing task controls remain between them. Library has only Options; Options pages have only Back. Reader navigation remains in its hideable toolbar, without reducing the score viewport. Calibration uses a persistent footer; fingertip content scrolls independently of its footer. A focused navigation button owns Enter, keypad Enter and Space, so activating Back or Options cannot also begin a trial, save a reading or mark practice Done.

Scrolling never displays a stock scrollbar. The shared application/dialog styling hides native bars while retaining wheel, touch and keyboard scrolling. The existing thin Options position marker remains available for overflowing settings panels.

The main menu uses a compact panel with aligned command rows and a labeled effort count. Its title, controls, counts and keyboard hints use the application's system font. Continue has initial focus. Arrow keys select enabled commands, Enter opens the selected command, and F, R, E and O directly open fingertip readings, rating review, export and Options. Disabled commands remain unavailable by shortcut. Menu navigation uses the shared Options navigator only on the main page; measurement selectors and rating input retain their existing keyboard behavior. Focus returns to the chosen menu command when leaving a subpage, including after starting or resuming effort work.

## Placement setup

The placement instruction asks the player to choose the most comfortable position anywhere on the highlighted keys. Highlights fill the full displayed face of the assigned Jankó level and stop at its boundary; the other physical copy stays unhighlighted. Conventional targets include their full front and rear outlines with black-key cutouts. Target bodies remain visible even at the widest tested distance. This display change preserves sampled key identities and the nominal geometry recorded in existing evidence.

On placement setup, the illustration precedes three separate instruction points in a centered block capped at 900px, with left-aligned text and equal font size and weight. All text, including finger indicators, uses the system font. This layout revision leaves the current measurement task unchanged. New setup acknowledgments retain the displayed comfortable-position wording. Exact earlier center/depth instructions are admitted as historical text without rewriting them or their associated reports.

The effort-rating page follows the same illustration-first order and uses the system font throughout. Its two instruction points, question and ratings occupy a centered 900px block with left-aligned text. Compact rating labels and descriptions fit completely at 1280×720; at narrower widths the descriptions stack and remain reachable through scrolling above the persistent footer. The five ratings, their wording, shortcuts and measurement protocol are unchanged.
