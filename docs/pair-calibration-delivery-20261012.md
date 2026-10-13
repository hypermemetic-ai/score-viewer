# Pair calibration screen correction — 2026-10-12

The pair measurement screen correction is reviewed, merged, packaged and activated on the user's Windows laptop. The app is open at **Options → Fingerings → Calibrate**, with its retained library, settings and progress.

## Behavior

The instruction is “Make static contact and rate the stretch.” Technical span, distance, row and contact-code summaries are removed. Left/right move between finger pairs; unanswered contacts remain unmeasured and recoverable. The separate skip command is removed. The hand stays at the upper right.

Keyboard rotation has an explicit Off/On mode and compact square controls. While enabled, arrows rotate, plus/minus zoom, Home resets and Escape leaves the mode. Camera changes retain measurement targets and evidence. Measurement navigation resumes after leaving the mode, including when a camera button has focus.

All six ratings, including **5 — Unavailable**, accept the player's report on every prepared contact. An initial unavailable report is saved without a fabricated reachable observation or outward boundary. Until an actual reachable result exists, the player can choose another starting contact. An outward unavailable boundary requires an earlier smaller reachable report on the matching arrangement, linked to both actual reports. Corrections preserve the ledger and recover the eligible target rather than reopening an obsolete starting contact.

The complete rating area clears the footer. Ordinary fonts, existing physical geometry, hand/setup declarations, other calibration phases and historical evidence are retained.

## Source and observations

Viewer [PR 91](https://github.com/hypermemetic-ai/score-viewer/pull/91) merged as `c3d05b0ba7eff4b485cb8d9bbe5148456ec3ccde`, tree `43d7e7f1d08290ad83a9c96290d0702ddc2e12f1`. Independent review approved the final source, and the reviewed head and merge have identical trees. The configured suite passed **1,119/1,119 tests** and the final strict TypeScript/Vite build passed. The unchanged calculator remains `06cb1575327f592e0ee8469a4f083355c199bdf6`.

Production Chromium inspection covered 14 observations with isolated synthetic storage: first unavailable reports, subsequent reachable/outward reports, retained unanswered targets through navigation and reload, camera input ownership, unchanged evidence during camera movement, and responsive rating layout. All six complete rating controls were observed at 1280×720, 1280×800, 1920×1080 and 640×800, without horizontal overflow or a stock scrollbar. Synthetic measurements were not placed in the user's native data.

Private source, browser, carrier and delivery receipts remain under `/home/qqp/.local/state/pair-calibration-20261012/`. The source-check receipt hashes to `d275469a9b79626dedd00fc1cd41b0351093f959a8203fb08ef5e35a32630f30`.

## Native delivery

The established carrier is `b1a5af69bf8248ac9671a642aca076afd60e715e`, tree `ee61aa8e261ba047867c778ff631e4e87be5574b`, with notation pin `b3fb5faa4297f92500f53513cdfee8496ab14d93`. Its 1,898 native source files and complete release-helper/workflow trees are unchanged from the previous delivered carrier. The temporary [carrier PR 368](https://github.com/hypermemetic-ai/iso-notation/pull/368) was closed without merging it into notation development; its branch remains for provenance.

[Workflow 38326248668](https://github.com/hypermemetic-ai/iso-notation/actions/runs/38326248668) passed in 756 seconds. Both optimized release compilations and the original worker gates passed, including native tests, Windows runtime, Mac universal/signatures/resources/minimum OS/DMG parity, startup, virtual MIDI, PCM and embedded frontend checks. The Windows native suite reported 118 passed, zero failed and two ignored device diagnostics. Mac invocations and their distinct scopes are recorded in `native-worker-evidence.json`; they are not combined into a misleading single count.

Independent actual-pair review re-read both complete ZIP inventories and all 20 embedded assets on Windows x64, Mac x64 and Mac arm64: the 19 frozen frontend assets plus release identity. Fresh complete HTTP downloads and the publication pointer matched the reviewed pair.

| Packet | Bytes | Members | SHA256 |
| --- | ---: | ---: | --- |
| Windows | 8,833,981 | 485 | `92f64d48cac6c92c611d7a3cdbd22f73dc34e2c6f2ba41592b474e05a6956786` |
| Mac | 30,236,612 | 509 | `f4cde37f4a8b602c4603a7f9bd6dda16c73dc47eb256cfc6c86805c75cb7785f` |

The fresh independent pair review hashes to `e7a552ed2673374dbf7cb048e35925cdce5bab2efdfdb2a8006ff522aff479f4`; its selected installation contract hashes to `a4468a4f005ff8db4b74b07cd0236dbbd3f0ad3b455990743eea141e05686e79`.

Windows was normally closed, preserved and installed additively at `C:\Users\qqp\ISO Score Viewer\0.1.0-viewerc3d05b0b-carrierb1a5af69-verified`. The usual desktop shortcut was atomically activated while retaining its existing metadata. The previous app, original shortcut and byte-exact saved-data backup remain available. Native application identity `dev.qqp.iso-score-viewer` is preserved.

All **835 managed saved files** were unchanged through preservation, installation and activation. A further read-only audit after launch found the same 835 files with no added, missing or changed bytes, and reverified the retained previous package, new package, data backup and activated shortcut. The protected Bidule process remained running and untouched. The preservation, installation and activation receipts respectively hash to:

- `284d6e037ec5acbbd8d037ff5d924ca437599f4f18efee7a5d084a46a5917485`
- `c9667adcd5c8909dd9a26fb0128c6f1d095832980371ea15e31c9743c571b7ae`
- `7e873a509b0c705c437b63e2cfa3e8b5200b26b9b92755d51bad14a9ad42e138`

## Inspection limits and closeout

The verified new Windows process was observed in the retained No. 14 library with Sections 34%, global Options, Fingerings and calibration home. Home retained 0/4 fingertip readings, 0/10 pair sweeps, 0/10 triples and zero actual pair judgments. The pair-screen interactions and responsive layout were inspected in production Chromium with isolated synthetic data, rather than adding invented measurements to the user's native collection. This delivery does not claim native hardware-keyboard or human physical calibration acceptance, a Mac installation, or physical MIDI/audio/pedal tests. Worker software checks retain their documented diagnostic and hosting limits.

Existing personal editing behavior is carried forward with 18 meaningful checks and matching 13 implementation modules and callbacks. The changed host keydown guard gives active core calibration priority; ordinary editing and nested curl order remain unchanged. This explicitly does not claim whole-keydown-callback byte identity, new timing measurements or new human editing acceptance.

Main specification changes are synced, and the completed OpenSpec change is archived as `2026-10-12-refine-pair-calibration-screen`. The task preview tab is closed, its temporary HTTP server is stopped, and worker/reviewer processes have finished. The requested installed app and established release service remain available. This closeout changes documentation and planning state only; the installed runtime remains the exact reviewed viewer merge above.
