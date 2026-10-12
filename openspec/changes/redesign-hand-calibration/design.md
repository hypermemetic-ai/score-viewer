# Design

## Context

See proposal.md for motivation. `calibration-pilot-v1.json` is a strict calculator session archive for a held-anchor protocol. Its controller already provides durable-write gating and safe lifecycle input. The calculator exposes bounded target templates (208 Jankó, 52 conventional per reference), but no fingertip evidence API or accepted RR landmark contract. User decisions at historical thread positions 302–328 explicitly require a real alternating trill; positions 331–358 require one pooled collection and four optional reach measurements.

## Goals / Non-Goals

**Goals:** Preserve accepted player-facing behavior and all existing data, with honest protocol and illustration provenance. Use separate, strict versioned raw collections so new evidence cannot be mistaken for historical calculator sessions.

**Non-Goals:** Change finger-cost fitting, calculate anatomy, convert percent to millimeters, or change auth/provider/build workflows. Exact RR physical modeling remains calculator-owned; the accepted measurement illustration is a declared visual reference for raw evidence.

## Decisions

### Separate new raw evidence from historical sessions

Use additive managed files `calibration-effort-v2.json` and `calibration-fingertips-v1.json`. Retain `calibration-pilot-v1.json` and `calibration.json` byte-for-byte. New effort records explicitly identify combined press + alternating trill, preserve target template provenance, performing hand, setup acknowledgment and append-only corrections/retractions. Do not feed these records through the old protocol validator or fabricate old-pattern attestations. Separate storage avoids a schema extension that would invalidate old archives. Export includes all retained evidence.

### One instrument collection with explicit performing hand

Use canonical right-hand target identities for progress; display a left-hand physical realization on request and record the hand actually used. Jankó can reflect pitch/contact coordinates. Conventional reflection must preserve white/black and narrowed rear key shapes, using a valid reference location with matching physical shape sequences. Validate every reflected target. No duplicate left-hand collection and no dimension editors. Instrument comes from main Options. Use standard nominal geometry and explicit source provenance in records, without exposing engineering text to players.

### Independent fingertip drafts and accepted presentation

Four adjacent pairs, one page each. Percent is signed finite decimal ≤100; mm is finite decimal ≥0. Keep drafts by pair/method/reference; saved data populates revisits, fresh readings stay empty. Primary selection stays visible as a normal dropdown for index–middle, middle–ring and ring–pinky. Thumb–index defaults to index by the user's latest explicit decision. Both gives 100 percent; Equal gives 0 mm. Save commits before advancing; arrows preserve drafts and do not save invalid or blank fields. No inferred method conversion.

Use the approved player-facing 36°/5° projection, aligned front plane and uniform 12.5 tip thickness, with natural key colors and unfilled corner markers. Copy reusable approved render data/code with provenance into the repository; never read private state at runtime. Keep fixed baseline font sizes (35 title, 25 instruction, 29 question, 57 reading, 20 navigation at design scale), URW Gothic, black backgrounds and square controls. Responsive adaptation must preserve hierarchy rather than opportunistically shrink unrelated text. Notation follows the saved application choice independently from color layout.

### Modal owns page-specific input

The new view exposes `key(event)`, `break()`, `dispose()` and `flush()` lifecycle seams. Main calibration routing consumes MIDI before practice telemetry. Rating digits/MIDI are admitted only on an acknowledged effort trial; measurement and Options pages cannot grade. Scope teardown, focus loss, reconnect and repeated controls clear or gate input; queued writes must finish before loading a reopened collection.

## Risks / Trade-offs

- New task differs from calculator protocol → version separately and export old records without reclassification.
- Conventional physical reflection could use the wrong black/white sequence → exhaustive contact/shape coverage tests for the full plan and explicit verified mirror mapping.
- Save failure or rapid modal reopen could overwrite evidence → write-before-publish, one flight per controller, retained bytes read-only, shared host enqueue and flush.
- Accepted drawings are schematic → store named illustration/landmark provenance; no numerical geometry inference or fingertip-to-cost fitting.
- Native and browser outcomes differ → inspect production browser views and built native resources; report native inspection separately.

## Migration Plan

Deliver a scoped reviewed viewer PR, retain old managed files, build through the paired native carrier and install using established preservation checks. Rollback can use the previous binary without deleting new additive evidence files. Archive the implementation change only after validation; record native delivery separately once build/installation evidence exists.
