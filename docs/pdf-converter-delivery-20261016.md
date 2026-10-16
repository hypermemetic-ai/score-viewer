# Save as PDF and converter delivery, 2026-10-16

Application `ba35e574ff39d96ee0fa3f3b0ebf64abe515f218` (PR 112 Save as PDF, PR 108 MuseScore/Guitar Pro converter with source-owned MusicXML hands) at notation `5364d40f2bc9793418037fd9ae3c5ff2dd329351`.

## Source and seal

- `npm test`: 1172/1172 passed. Build: TypeScript, source pin, Vite; 22 frontend files, digest `1ff24197…`.
- `scripts/check-pdf-export.mjs` on a private data copy of No. 14: reader vs. PDF 0/1/1 differing 8 px blocks on pages 1–3, 6 embedded fonts, data copy unchanged. Headless Chromium, not WebView2.
- Seal PR 113. Independent review rebuilt the frontend and regenerated the seal from a clean checkout byte-identically.

## Paired build

- The first run (38927973341) refused on Windows before compiling: `src-tauri/src/score_pdf.rs` lacked `-text`, so the CRLF checkout differed from its sealed bytes. PR 114 added the attribute, and freezing now refuses unprotected native inputs.
- Run 38929936261 at delivery `cf14ec5f5a0918773513c833948925115b8e17d7`: prepare, Windows, universal Mac and pair assembly passed. Published `0.1.0-cf14ec5f…`; Windows.zip SHA256 `bc0a01a0…ff8b24`.

## Windows installation

- On `DESKTOP-7LVJ0U3`, the package was extracted next to the previous version as `0.1.0-viewerba35e574-carriercf14ec5f-native`. All 480 files match the package.
- The previous viewer had been idle since its last data write at 23:21 the night before, and it did not respond to remote keys. It was closed with Alt+F4 at the operator's request.
- A closed backup captured all 1865 managed files. The usual shortcut now targets the new executable, and the previous package and shortcut remain for rollback.
- The shortcut launched the new viewer in console session 1. The library showed all scores and No. 14's practice progress. The reader opened at the saved page with the personal hands.
- After launch, only `preferences.json` and `viewer-derived-cache-v1.json` differ from the backup. Scores, personal journals, assistance history, practice and calibration are unchanged.

## Not established

- Save as PDF was not exercised in the installed viewer. Remote keyboard and edge-hover input did not reach the WebView, so the reader toolbar could not be opened, and WebView2 `PrintToPdf` output is unobserved.
- Mac packaging passed in CI but was not installed. Physical MIDI, audio, pedal and pianist acceptance are separate.
