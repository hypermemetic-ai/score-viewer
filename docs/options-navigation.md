# Options and keyboard navigation

Options opens a centered dialog with a section list and one settings panel. Score appears when a score is loaded; Practice comes first while practising. Input / output, Piano, Keys / pedals, Fingerings and Hands retain their existing controllers and saved settings. Piano installation determines which sound controls appear. Instrument-reading scores omit piano-only actions and bindings.

Up and Down browse sections. Right or Enter enters their settings; Left returns to the selected section. Setting rows have a stable order independent of their screen position. Enter opens a picker or numeric draft; arrows then change that draft, typing remains available, Enter commits and Escape cancels. Browsing a numeric field or picker does not change its value. Mouse chevrons remain outside keyboard navigation. Tab cycles the visible dialog controls.

Pickers, numeric drafts, binding editors, capture and Test own their keys before the surrounding dialog. Escape backs out of the current owner before closing Options. Piano help returns to its opener. The shared Navigation footer and Back control remain available at quarter-turn display rotations and narrow widths. A held navigation key can continue browsing, while repeated Enter, Space or Escape cannot repeatedly activate an action or dismiss successive layers.

The Options binding is shared by the library, reader and practice surfaces. Changing its default O binding changes both the action and its displayed hint; an old hard-coded library O shortcut no longer bypasses that choice. Context filtering hides unavailable rows without deleting their saved assignments or changing binding inheritance.

The keyboard audit also corrected toolbar arrows turning score pages while browsing controls, late asynchronous panel focus stealing, Tab losing the dialog's control cycle after resize, and hidden Keys Test accepting a shortcut from another panel. Held page and Free view navigation retain their passage/page bounds. Reader presentation changes reuse bounded admitted page DOM, preserving glyph focus; finger, selection and contact state are repainted each time rather than cached as presentation state.

## Verification

Build first, then run the production browser checker with Playwright provided by the verification environment:

```sh
npm run build
PRACTICE_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
OPTIONS_ARTIFACTS=/absolute/path/to/private/evidence \
node --import tsx scripts/check-options-keyboard.mjs
```

The checker serves the built frontend on a bounded loopback server, closes its browser/server in `finally`, and writes captures and a result record outside the repository. It exercises library, reader, toolbar, Options sections, practice selector/components/Include manual, active controls, numeric drafts, binding capture/Test, nested piano help and custom bindings using real keys. Shared 90° and 270° rotation is tested at ordinary and narrow viewports, including footer enclosure and nested focus return. Public instrument-reading input tests capability filtering. A separately identified browser IPC simulation tests the production piano download/install, volume, rigid latency steps and help controls; it does not establish native audio, driver, MIDI or latency acceptance.

A separate private browser check uses retained Schumann state without changing native files. It exercises joined passages and their original components, held reader page navigation, and held Free view navigation through overlapping windows at both passage edges. Paid material and its captures remain outside Git. Source tests, configured build, strict OpenSpec and browser observations are independent evidence. Native installation and physical musical acceptance remain the combined delivery lane's responsibility.
