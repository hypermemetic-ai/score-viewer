# Common musical reading and instrument policy

This increment admits common musical reading independently of piano physical preparation. Musical events share one canonical ISO pitched/unpitched model. Instrument policy selects center, guides and stem behavior as data passed into the shared ISO layout and ink engine. The Viewer retains its library, saved view, page navigation, rotation, scale and file-saving paths.

For the approved bass policy, actual sounding C2/MIDI 36 is the stable center; C1/C2/C3 are MIDI 24/36/48 guides. ISO coordinates subtract 12 from MIDI, so the policy stores center 24 and guides 12/24/36. Source written-to-sounding transpose is resolved by the shared MusicXML projection before coordinates are calculated. The Viewer does not transpose notes, recenter per song, infer fingers, or display frets. Explicit player transposition remains a separate feature.

Unpitched events carry `soundingPitch:null` and a separately named notation reference. They cannot carry a definite `pitch`. The reference may position an x head but cannot produce a MIDI note, physical key, frequency or piano fingering. H/P relationships have source-owner endpoints and visible labels; shared ISO engraving supplies their ink.

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

The manifest's reading descriptor records shared engine authority, policy and resolved preparation inputs. Admission verifies the ordinary file hashes, validates canonical source facts, regenerates pages/ownership/layout with that exact shared authority, compares their content and applies passive SVG checks before library writes. It refuses piano keyboard descriptors, finger layers, calculation contexts and reference-MIDI descriptors in this version. Bounds are 10,000 musical events, 2,000 measures and 500 prepared pages within the existing archive byte limits. These are prototype admission limits, not claims about every MusicXML score.

Versions 1/2 retain their original serialized score, hashes, source revisions, owner/action IDs, pages, fingers and personal bindings. Their passive boundary normalizes an absent event discriminator into a pitched canonical event without rewriting the archive. Unknown or contradictory kinds refuse. Current consumers use the same event union; physical operations validate a pitched event and a genuine performing role at their own use sites. Reading never assigns LH because a track is bass or because a reference position is low.

The shared page reader exposes ordinary navigation and options for version 3. Its keyboard switch, finger controls, MIDI note assessment, guided piano practice and piano performance are unavailable. Existing piano score requirements remain in effect. Hidden saved control assignments and their conflict checks remain intact when options display only available actions. Ordinary library staging retains earlier packages and saved views without a personal-data migration.

## Local preparation

Run the checked private notation dependency and existing frontend toolchain:

```sh
node --import tsx scripts/prepare-reading-score.ts source.musicxml output.tuna \
  --part=PART_ID --center-midi=36 --guide-midi=24,36,48
```

This local command invokes ISO's MusicXML reader/projector and shared preparation, writes a new `.tuna` archive with retained font notices, and prints coverage and event/page counts. It refuses output overwrite. Source selection and center/guide parameters are explicit data; the command supplies no alternate instrument renderer. Inputs and generated repertoire archives belong outside Git. Conversion and score redistribution remain separate authorities.

The transitional dependency remains a deliberately pinned private ISO revision; see [migration](migration.md). Frontend tests/builds and browser observations do not establish an installed native Windows/Mac build or human musical acceptance. This task does not dispatch a release or modify the user's installation.
