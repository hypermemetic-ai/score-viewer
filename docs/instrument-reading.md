# Common musical reading and instrument policy

This increment admits common musical reading independently of piano physical preparation. Musical events share one canonical ISO pitched/unpitched model. Instrument policy selects center, guides and stem behavior as data passed into the shared ISO layout and ink engine. The Viewer retains its library, saved view, page navigation, rotation, scale and file-saving paths.

For the approved bass policy, actual sounding C2/MIDI 36 is the stable center; C1/C2/C3 are MIDI 24/36/48 guides. ISO coordinates subtract 12 from MIDI, so the policy stores center 24 and guides 12/24/36. Source written-to-sounding transpose is resolved by the shared MusicXML projection before coordinates are calculated. This reading path keeps actual source pitch fixed, uses the selected center, and supplies no inferred fingers or visible frets. Existing piano transposition remains available for piano packages; player transposition for common instrument reading is a later feature.

The current register policy keeps rhythmic groups intact and minimizes the number of visible heads departing from their register direction relative to the selected center. Continuity chooses among equal minima. This is the implemented policy; an outward-stem clearance optimizer has not been selected or implemented. H/P relationships retain source-owner endpoints and use curved connectors with H/P labels, as requested. Shared ISO engraving supplies their ink. The earlier square-bracket checkpoint did not follow that request and remains historical evidence only.

Version 1 explicitly gives stems visual register meaning. It refuses source, editorial or calculated performing-hand authority before layout; missing hand facts alone do not authorize changing stem meaning. Existing piano packages retain performing-hand semantics. Other direction meanings need an explicit future contract.

Unpitched events carry `soundingPitch:null` and a separately named notation reference. They cannot carry a definite `pitch`. The reference may position an x head but cannot produce a MIDI note, physical key, frequency or piano fingering.

## Package admission and compatibility

The additive `iso-score` version 3 archive contains:

| Member | Responsibility |
| --- | --- |
| `score.json` | Canonical common musical events, parts/instruments, exact clocks, written/actual pitches, source relations and reading policy |
| `reading-owners.json` | Independent event ID, part/staff/voice ownership, event kind, sounding or notation-only coordinate, and every prepared head appearance |
| `reading-layout.json` | Shared system/page geometry, stable center/guides and owner-linked positions |
| `pages/*.svg` | Passive prepared pages from the declared shared real-engine authority |
| `seats.json` | Empty physical-seat layer; reading creates no keyboard contacts |
| Font and notices | The existing exact URW font and its retained notices |

The manifest's reading descriptor records shared engine authority, policy and resolved preparation inputs. Admission verifies the ordinary file hashes, validates canonical source facts, regenerates pages/ownership/layout with that exact shared authority, compares their content, requires complete event appearances and a passing shared engraving report, and applies passive SVG checks before library writes. Source recovery can therefore succeed while an unresolved engraving collision prevents a reading archive. It refuses piano keyboard descriptors, finger layers, calculation contexts and reference-MIDI descriptors in this version. Bounds are 10,000 musical events, 2,000 measures and 500 prepared pages within the existing archive byte limits. These are prototype admission limits, not claims about every MusicXML score.

Versions 1/2 retain their original serialized score, hashes, source revisions, owner/action IDs, pages, fingers and personal bindings. Their passive boundary normalizes an absent event discriminator into a pitched canonical event without rewriting the archive. Unknown or contradictory kinds refuse. Current consumers use the same event union; physical operations validate a pitched event and a genuine performing role at their own use sites. Reading never assigns LH because a track is bass or because a reference position is low.

The shared page reader exposes ordinary navigation and options for version 3. Its keyboard switch, finger controls, MIDI note assessment, guided piano practice and piano performance are unavailable. Existing piano score requirements remain in effect. Hidden saved control assignments and their conflict checks remain intact when options display only available actions. Ordinary library staging retains earlier packages and saved views without a personal-data migration.

## Local preparation

Run the checked private notation dependency and existing frontend toolchain:

```sh
node --import tsx scripts/prepare-reading-score.ts source.musicxml output.tuna \
  --part=PART_ID --center-midi=36 --guide-midi=24,36,48
```

This local command invokes ISO's MusicXML reader/projector and shared preparation, writes a new `.tuna` archive with retained font notices, and prints coverage and event/page counts. It refuses output overwrite. Source selection and center/guide parameters are explicit data; the command supplies no alternate instrument renderer. Inputs and generated repertoire archives belong outside Git. Conversion and score redistribution remain separate authorities.

The browser probes `scripts/inspect-instrument-reading.mjs` and `scripts/inspect-piano-score-options.mjs` exercise the real app in isolated browser storage. The piano probe uses the existing original transfer study and checks visible physical controls, transposition through Score options, paired actual/written pitch movement, restoration of zero and unchanged original archive bytes. The reading probe checks source-owned x heads, curved H/P connectors and every modified written component's visible ratio, including rests, together with available actions, saved-view reopening and unchanged archive bytes. Their screenshots and receipts belong outside Git; source replay and observed SVG/DOM establish what was prepared and displayed, while human musical acceptance remains separate.

Preparation records resolved page dimensions as part of the replayed receipt. The command uses the shared default `headerHeight:48`; the earlier source preview used 66. A local comparison at the historical checkpoint preserves event ownership, clocks, relative head positions, rhythmic groups, stem and beam geometry, and relative expression geometry. Both historical layouts pass the geometry gate. Page system positions change with the available body height, so their SVG bytes differ. This comparison does not establish human acceptance of either preview.

The corrected technical preparation uses `janko-real-engine-instrument-reading-v2-curved-techniques`. Historical v1 square-connector archives remain unchanged and are refused by this prototype authority; they are not silently relabeled or re-rendered. This versioning correction does not alter legacy piano v1/v2 serialization or personal bindings. The notation dependency is deliberately pinned to reviewed ISO `a0e1b089000bf02e8f2e60a6d4f0837ae36112a0`, recorded in [source provenance](source-provenance.json), retaining the original application extraction revision. See [migration](migration.md).

At reviewed curve source `6691de7659378e26ed905d839f9f91b329146549`, 113 focused Viewer checks pass with no skips or cancellations, covering reading replay/tamper refusal, legacy and canonical transposition, retained originals, calculated-hand receipts, recipes, personal bindings, keyboard presentations and real workers. TypeScript/Vite production build also passes. The earlier complete 490-test run and SDK closure belong to historical `c23f520`; they are not a claim that the full suite was rerun for this correction.

At the final guarded pin `a0e1b089`, 29 focused reading, transposition/selection and recipe checks plus the production build pass. A rehashed archive regression rejects present malformed display stem directions before geometry. The shared guard also prevents visual directions from overriding genuine performing-hand authority. Valid curved preparation and engine identity remain unchanged; separate-process admission at this exact pin replays the same private archive with zero geometry errors or warnings.

A new private bass archive, prepared at reviewed curve source `6691de7`, cold-admits in a separate process at the final guarded pin: 10 pages, 1,013 independent musical events, nine curved H/P connections, no physical seats and zero geometry errors or warnings. Its literal musical score bytes and canonical owner facts match the historical archive; only preparation authority/ink and archive metadata change. Every owner retains a visible appearance, and all systems retain actual C2 and C1/C2/C3 guides. The historical archive's bytes remain intact and its old preparation authority refuses explicitly.

Actual-app reading checks at `6691de7` observe the x head, all nine curved H/P connections and all 34 modified written components, including one rest, across 12 visible ratio fragments. Saved views reopen, physical actions remain unavailable and source bytes remain unchanged. The piano probe observes visible physical controls, Score Options transposition +1, paired actual/written pitch movement, restoration to zero and unchanged original bytes. Neither probe observes a page error. The final guard leaves this valid prepared output byte-identical, and the same archive replays exactly at that pin. The actual reader captures were inspected for visible score ink and a curved H-labeled connection; these observations do not establish user musical acceptance.

The broader shared-source research selection retains documented baseline failures; these results do not assert all source suites pass or establish release readiness. Pagination and an outward-stem clearance optimizer remain separate layout questions. Frontend tests/builds and browser observations do not establish an installed native Windows/Mac build or human musical acceptance. This task does not dispatch a release or modify the user's installation.
