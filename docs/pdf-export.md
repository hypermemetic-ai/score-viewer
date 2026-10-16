# Save as PDF

The reader toolbar and Options → Score offer **Save as PDF** beside Share score. It saves every page of the score as the reader currently reads it: the open edition and keyboard layout, personal hands and fingers, and the current label mode (pitch labels, or finger numbers while they are shown). With Hold finger behavior, finger numbers are saved only while fingers are held. Editing selection outlines and advice marks are not score ink and are left out. Practice does not offer the command.

Each page is a fresh copy built and painted by the same code as the reader (`createReaderPage`, `paintReaderSeats`). The copies are mounted as print-only content (`src/score-pdf.ts`) and printed by the webview that painted the reader, so the fonts it loaded (URW Gothic, the FontFace footer serif, system serif faces) are the fonts in the PDF. The page size is the engraved page's own width and height.

On Windows, the native `export_pdf` command shows a save dialog and calls WebView2 `PrintToPdf` with that page size, no margins and no header/footer. The output is vector, with embedded font subsets. Nothing is sent over the network and no managed file, journal, assistance store or package is written. Saving a PDF is not yet available in the macOS application; the command explains this. In browser preview the command opens the browser's print dialog.

`scripts/check-pdf-export.mjs` compares the exported pages with the reader in headless Chromium against a copy of managed data. It never needs live data. Chromium's PDF printer is the engine behind WebView2 `PrintToPdf`, but the script is not evidence about the Windows runtime, its installed fonts or an installed package.
