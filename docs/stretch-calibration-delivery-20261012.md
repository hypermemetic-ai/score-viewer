# Static stretch calibration delivery — 2026-10-12

The updated calibration contract is implemented, reviewed, merged, packaged and activated on the user's Windows laptop. The entry point is **Options → Fingerings → Calibrate**. This record supersedes the earlier alternating-protocol calibration delivery for the active collection interface; historical evidence remains untouched and exportable.

## Delivered behavior

Each declared hand/setup has four signed fingertip readings, ten adaptive same-row pair sweeps and ten conditional triples. Percentage remains the default; direct millimeters and visible primary-finger selection remain available. Pair collection requires a reachable baseline before outward judgments, distinguishes all terminal conditions, and never classifies smaller untested gaps as unavailable. Triple evidence retains the actual grade-3 pair source and its contact realization. Optional curl evidence uses declared external measurement conventions without inventing anatomical quantities or fitting personalized fingering costs.

The accepted solid RR/Jankó models have uniform tip thickness, depressed actuator geometry, highlighted playable surfaces and free camera rotation/zoom. Measurement windows remain anchored when the camera changes. Calibration uses ordinary fonts, inset left-aligned text, thin dash instructions beside the illustration, ratings below it, grouped review, shared Back/Options positions and hidden stock scrollbars. Notation belongs to app-wide Options; Traditional remains unavailable. Computer keyboard ratings are release-safe and calibration does not collect MIDI playing telemetry.

## Source and validation

- Viewer [PR 89](https://github.com/hypermemetic-ai/score-viewer/pull/89) merged as `0258a54ade4434364e8e30fe14481adf9f671356`, tree `b8e5ce8d69a9c7ea2642f5ffce83d90266b4fc6b`. The reviewed head and merge have identical trees.
- Calculator [PR 32](https://github.com/hypermemetic-ai/fingering-calculator/pull/32) merged as `06cb1575327f592e0ee8469a4f083355c199bdf6`. Its 97 tests, typed root package and packed inventory passed. Existing implementation bodies and prior root exports were retained.
- The complete configured viewer suite passed **1,103 tests** before the final isolated focus fallback. After that correction, six production lifecycle/focus regressions passed and the final strict TypeScript/Vite build passed. This does not claim a subsequent full 1,104-test run.
- Actual production Chromium inspection covered 17 synthetic cases: signed readings and drafts, baseline/outward pair ratings, held/chord/repeat protection, terminal corrections, linked triples, nested curl saving, hand/setup separation, grouped keyboard navigation, malformed archive retention and byte-verified exports. The final rebuilt focus case and malformed export were checked after the final focus correction.
- Independent integrated source review, carrier review and final native-pair review passed. Pending writes from retired calibration owners are drained before reopening/export/exit; nested curl retains the suspended core editor's drafts.

Private logs, source/browser review receipts and native screenshots remain under `/home/qqp/.local/state/stretch-calibration-20261012/`, outside Git and recipient packages. Browser screenshots are referenced by the browser receipt in T3's userdata; temporary export downloads were byte-verified during inspection and removed during cleanup. The source check receipt is pinned by SHA256 `5b56e6440aee3383973bbda996bcc4f8a685caba832b6c63c24e2603f6923259`.

## Native pair and installed identity

The established carrier path used `00ef09b868ef086fc40e45690289f40b5a8e417b` with notation pin `b3fb5faa4297f92500f53513cdfee8496ab14d93`. Its temporary [PR 367](https://github.com/hypermemetic-ai/iso-notation/pull/367) was closed without merging the application carrier into notation development. The carrier branch is retained for provenance.

Workflow `38320136769` passed the original Windows and Mac worker gates in 802 seconds, including actual native tests, embedded frontend proof, Windows runtime checks, Mac universal/signing/resource/DMG checks, startup, virtual MIDI and PCM gates. Local publication initially lacked `fflate`; installing the carrier's declared dependencies allowed the same completed workflow artifacts to be independently verified and published, without rebuilding or skipping gates.

The source frontend inventory has 19 assets. Each Windows x64, Mac arm64 and Mac x64 embedded inventory has those assets plus release identity. Both complete served ZIP downloads were read back and verified:

| Packet | Bytes | Members | SHA256 |
| --- | ---: | ---: | --- |
| Windows | 8,833,564 | 485 | `d34af33eaee686dd5b25750a50ae68d08b59c25c176da529ceba598d0682c0d9` |
| Mac | 30,234,192 | 509 | `86004f2d869de9458210a49cdd9830f552c06d8b7b1b3ff45c871ca3ab2f1211` |

Windows was installed additively at `C:\Users\qqp\ISO Score Viewer\0.1.0-viewer0258a54a-carrier00ef09b8-verified`. The usual desktop shortcut was atomically activated to that executable while retaining its existing metadata. The old application, original shortcut and byte-exact saved-data backup remain available. Installation preserved the native application identifier `dev.qqp.iso-score-viewer`.

All **835 managed saved files** were unchanged through preservation, installation and activation. A further read-only audit after launch found the same 835 files with no added, missing or changed bytes, and reverified both installed packages, the backup and activated shortcut. The protected Bidule process remained running and untouched. Preservation, installation and activation receipts respectively hash to:

- `6c37a574d0a67c80c4dbd6a4a7da71d3efc43f1fdad1b65847dd693d332c6d2b`
- `b71c3a843ada03be7b2f7e4e113530b464a59ec2576111ac21616e104566fc8a`
- `597f52cb43ec1a24d57776da258475ec9f150152ade0d30b6305f6f3ba4f1431`

## Observation scope

The verified installed Windows process was observed in the retained score library (No. 14, Sections 34%), global Options, Fingerings, the new calibration home and the blank hand/setup form. The native home showed the correct 0/4, 0/10 and 0/10 progress; the form showed separate hand, range, pair row and central reference controls. No synthetic measurements were saved to the user's native data. The remote shortcut probes for arrows and N were inconclusive; source tests and real Chromium event inspection establish those keyboard paths, without claiming native hardware-keyboard acceptance.

The rotating measurement model and collection/review interactions were inspected in the built browser with isolated synthetic storage, not through invented native physical measurements. Worker MIDI/audio gates are software delivery evidence; this session did not perform physical music input, human calibration, human musical acceptance or a Mac installation. Prior editing behavior was carried forward with matching implementation/callback evidence and 18 checks; no new timing or human editing acceptance is claimed. These are explicit limits on the observations, not missing installation steps.

Accepted delta specifications are synced into the three main calibration specifications, with existing Purpose sections retained. The completed OpenSpec change is archived as `2026-10-12-implement-stretch-calibration`. This closeout changes documentation and planning state only; the installed runtime remains the exact reviewed viewer merge identified above.
