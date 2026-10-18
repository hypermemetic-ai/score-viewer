# Initial practice selector fit

Source follow-up starts from Viewer `0c6c60efd03f5d3a0a4bb4252bd8b48fb02055cb`, with the unchanged ISO pin `7205da0d6b62a4a023eda5f2f5d66bdec4fa6493`. It maintains the complete-ink fitting requirements of `repair-practice-rendering`; it introduces no engraving, source, cache, audio or native policy.

The actual original Jankó Zelda archive was observed through the production main application in isolated browser storage at 1280 × 720 CSS pixels, device scale 3. The first measures 1–4 preview used a 467-pixel SVG while the completed footer left room for 423 pixels. The overview's client height was 564 pixels and its scroll height 596 pixels. Returning to the same leaf already fitted correctly. The 44-pixel fitting difference was exactly the selector footer's height.

Initial mount now establishes orientation without drawing an incomplete preview. The normal paint renders the header, footer and status before fitting the selector notation. The original complete passage uses the same uniform scale and viewBox. No overflow suppression, crop masking, independent measure scaling or reflow was added. Active practice continues through its existing rendering and protected-measure rules.

The same full-main opening now produces a 423-pixel initial SVG, overview client/scroll heights both 564, and the same fit after navigating away and back. Its complete Ped. outlines and hold lines were visually inspected. Private before/after captures and receipts remain outside Git under `/home/qqp/.local/state/score-viewer-selector-initial-fit-20261009`; before receipt SHA256 `1559f5fd529d3ab7e1ad0f16a6bb74265d5b8240f69299bf8c4772ea52824119`, full-main after receipt `28a00ad9caa9836dcb128efcdae66c38340ba13453917df6e3966967d57410f9`.

`scripts/check-practice-selector-fit.mjs` mounts the production PracticeView without a corrective post-mount refit, using real browser SVG geometry. It checks original Schumann and Zelda in independently selected Conventional/Jankó presentations: initial 1–4, away/back, return from Free view, 17–20, Zelda's five-bar cross-system leaf 25–29, shared 90/270 rotation and a shorter 1280 × 540 window. Every sample requires the complete SVG to fit the overview without vertical or horizontal overflow. The source pedal paths intersecting a displayed crop retain their full vertical ink; both the Ped. outline and hold line must remain inside the complete passage SVG. Initial measurements must have a real footer allocation. Public legacy Schumann receives only an isolated reference-tempo augmentation; private Zelda is imported unchanged. The runner loads the existing shared UI face before mounting, matching the library/reader route.

All 30 samples pass, with no browser errors. The private production regression receipt is `production-regression/receipt.json`, SHA256 `3c6db925bb8134f41f5d122b40921919a9e44beaf5625e96b19064f4cedc4782`. Actual initial Zelda captures in both keyboards and its 270-degree rotation were visually inspected; the Ped. outlines and hold lines remain complete. These observations do not claim every possible joined-range width fits.

Run the public regression from a configured checkout with Playwright available:

```sh
PRACTICE_PLAYWRIGHT=/path/to/playwright/index.mjs \
PRACTICE_ARTIFACTS=/path/to/private/output \
/home/qqp/.local/bin/qq-job -- node scripts/check-practice-selector-fit.mjs
```

Optional `PRACTICE_ZELDA=/path/to/original.tuna` runs the same checks on the read-only operator archive. No acquired music, screenshots or personal data are committed. The runner owns an ephemeral loopback server and browser and closes both on success or failure.

All 544 configured source tests, TypeScript/Vite build and all 12 strict OpenSpec items pass. This establishes source/browser fitting at the observed sizes, not new native WebView, paired release, installation or physical musical acceptance. The sole native delivery owner must freeze and independently verify any replacement package. Existing wider joined-range admission limits remain unchanged.
