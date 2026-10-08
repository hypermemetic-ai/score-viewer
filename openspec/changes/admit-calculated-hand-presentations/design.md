# Design

## Context

See [proposal.md](proposal.md) and [the capability delta](specs/calculated-hand-presentations/spec.md). Viewer discovery used main `57eef0cc5fda0f33cb5c4a62fd4335a9265568fd`; the dependency is ISO `da93cf9e0359d861987fd76611b59b14b6aedb92`. ISO's reviewed plan is PR327, main `a8c58e75f2f45b9bb162dc0c90eb90ae71bed491`, change `engrave-calculated-hand-divisions`.

`piano-readiness.ts` adds automatic all-owner retention, carries installed constraints, freezes all hands for personal history and rejects changed hands before its renderer branch. Its current-layer shortcut does not bind hand policy. `package.ts` admits immutable musical facts by removing effective hand fields and comparing the remainder; ISO's new derived provenance must receive explicit validation rather than a broad exemption. `state.ts` binds corrections/practice files by source, layout, profile and hand digest, and `readPersonal` validates actual seats. `stagePresentationInstall` already stages immutable package/state files before the library pointer and retains prior packages. These protections remain.

## Goals / Non-Goals

**Goals:** Make authority decisions explicit and owner-scoped; admit coherent calculated editions; retain original source and older edition journals; develop independent gates before the new ISO engine is ready.

**Non-Goals:** Implement or copy ISO engraving/solver modules, redesign musical import, certify continuous movement, migrate native identity or publish a competing native delivery. Paid Zelda material remains outside Git.

## Decisions

### 1. Isolate request authority construction

A dedicated Viewer authority builder reads the immutable planning source, admitted active layer and checked personal state. It validates source-owner guards before classification. Automatic retention is removable only when the hand-only shape, known exact Viewer reference, guarded owner facts and provenance kind all match. Unknown automatic labels require conflict/review. Preserve operator-choice constraints and source-instruction authority in their existing supported contracts; the source requirement compiler remains authoritative. Partial declared finger/contact constraints remain partial and constrain only their named owners. Personal overrides supersede prior finger/contact choices only for the same checked owner, preserving its hand. Historical undo/history records do not introduce fresh all-owner locks.

Historical `reviewedFingerAuthority` must be an admitted explicit-operator-review with complete matching source facts. Unknown optional authority must fail before cache reuse. Never convert calculated provenance into an editorial correction. Explicit `retain-imported` remains a separate policy for an operator-requested bounded calculation.

### 2. Introduce passive preparation identity with strict replay

Add a versioned optional preparation identity to linked presentation descriptors and package views, retaining legacy readability. It binds source hash, layout/profile, reference/calculation context, policy, canonical guarded constraints, canonical owner assignment tuples, and recipe plus actual pages/seats/score payload hashes. A source-matching saved layer is reusable for a new request only when independently validated metadata matches that request and payload. New identity is immutable/passive package data, never executable content. Import independently recomputes relevant hashes; unknown version and tampered fields refuse admission.

Canonicalization sorts owner choices and recursively object keys, preserving array order where order has musical meaning. Determinism excludes incidental runtime diagnostics but includes calculator contract/search policy where relevant. Existing source and hand digests keep their current meanings.

Opening a retained edition remains reading of its frozen bytes. An explicit Generate/recalculate request uses the current joint-hand policy and never gets satisfied by a legacy unkeyed layer. The normal reading path must distinguish retaining an edition from requesting a new calculation so obsolete policy does not prevent access to historical pages.

### 3. Keep changed-hand activation gated by the actual ISO contract

Prepare from immutable source and complete owner choices. Reproduce the retained recipe's source baseline before adapting; select only a reviewed compatible new ISO recipe. ISO returns the derived provenance, complete pages/seats, independent source ledger and geometry admission. Validate the actual derived-hand contract and recipe rather than fabricating an engine constant or merely deleting the final reassignment refusal. Reimport the assembled archive independently before returning ready/editable.

Initial changed-hand preparation regenerates the complete presentation. Same-hand fixed-page attachment remains allowed only when the full physical hand map matches and package/layer/source validators pass. All-five replacement remains optional; annotation-only output is a valid separate capability. Unsupported grace choice, insufficient audit coverage, baseline mismatch, authority conflict and fit refusal preserve original bytes and specific owner-bearing reasons.

### 4. Retain edition journals; carry only checked active choices

Keep the prior package and state pointer in `Entry.retainedPackages` and `personalFiles`. For unchanged source/layout/profile/hand identity, rebind the revision only after `readPersonal` checks the target; existing layer history remains compatible. When hands or profile change, construct a fresh personal state with compatible view settings and explicitly revalidate every active correction against target seats and owner/contact facts. The old undo/layer/history journal stays in the retained prior edition instead of being mixed with new-hand pages. A correction compatibility failure refuses the candidate; it is never silently dropped. Original correction provenance remains exact.

Offer retained-edition selection as an edition action that loads the matching frozen package and existing sidecars without triggering a calculation. Existing same-edition calculated-version selection remains finger-only. New prepared editions append their semantic presentation revision to state/practice/performance storage keys and personal binding; legacy keys remain unchanged. This separates same-hand regenerated geometry whose practice/performance records have different revision guards. Retained package snapshots preserve each edition's personal-file map even when another prepared layer shares compatible source/hand geometry. Selecting another edition never rewrites its predecessor's practice file or performs an automatic legacy-sidecar migration.

### 5. Reuse the existing atomic install boundary

The readiness worker returns only a complete admitted package and compatible state. Staging writes content-addressed package and versioned state, checks active job/library identity, and changes `library.json` once. Package/state failure or supersession leaves current pointers unchanged. Retained selection uses the same coherent checked boundary. No preference/device changes are part of calculation or edition preparation.

### 6. Derive acceptance independently

Use authored public sources for both keyboards with source-only expected owners, silence identities/multiplicity, authored beam edges, tie components/releases and repeat occurrences. ISO owns their rendered coverage proof; Viewer tests mutate descriptors, payloads, policies/constraints and edition/state affiliation independently. Include both transfer directions, same-hand independent voices, unequal-release aliases, written continuation/following attack, repeats/boundaries, stale authority, history-only state, per-owner corrections, cache order and atomic failure. Real-engine complete-page/focused review is required once exact ISO interfaces exist; passing synthetic or copied partition tests is not visual acceptance.

### 7. Bind new footer drawing to exact portable ink

The reviewed follow-up uses `viewer-annotation-ink-policy-v1` / `viewer-footer-serif-v1`, `viewer-calculated-hand-edition-v2` and new preparation/request identity `viewer-piano-preparation-v3`. Historical V1/V2 identity hashes and V1 receipt/footer drawing retain their meanings. The new policy remains Viewer evidence; ISO engine/recipe fields and its owned-head-and-duration coverage stay unchanged. Source, raw/seated pages, seats and baseline/output hashes remain literal bytes.

An unmodified licensed Liberation Serif Italic2.1.5 face (400italic,2048UPM) and independently extracted cmap/advances/complete outline bounds cover the finite `Page N of N` footer alphabet. Both asset and metric hashes bind the policy/context/receipt. New derived footer drawing uses a unique verified family and explicitly disabled kerning, ligatures, synthesis and spacing variation. Actual scalar positioning, end anchor, affine transform, stroke and outward numerical padding feed the complete foreign-ink inventory. Unsupported text/features remain conservative; no footer exemption or guessed font width is introduced.

Every preparation/cold reader verifies the exact font/metric payload. Browser/worker readiness loads the unique face from verified bytes, without assuming Canvas/SVG or worker/document font parity; Node independently verifies the file and compiled payload. Load, decode, hash or family ambiguity refuses before staging. Receiver cold import remains independent. Reader and practice/crop drawing share the same policy helper, with no stored page mutation or historical footer override.

The exact face and complete copyright/OFL/provenance notice are explicitly emitted and accessible in the web build. Carrier adoption adds one reviewed native/root notice mirror without changing the existing1891native/config input bytes or23piano notices. Exact generator adapters extend the existing notice-copy/resource-verification lists and generated resource merge map; prepared, Windows recipient, Mac app/resources and DMG checks require actual new notice bytes. No workflow/provider/auth/audio/device changes are included.

The final metrics enclose complete head/hhea/OS2 vertical cells and every glyph's advance/outline overhang, with two page units of drawing allowance plus transformed stroke/numerical padding. `geometricPrecision` is explicit. Mounted historical fallback drawing is compared before and after the unique face registers; existing V1/V2 hashes and sidecars stay frozen.

A separate public `footer-ink-probe.html` entry imports the production readiness job, real Worker, cold reader and drawing policy without booting `main.ts` or managed data. It prepares both keyboards from the independently frozen public V2 fixture, records every returned-page footer enclosure, checks nine mounted zoom/affine variants, and refuses receiving-realm unavailable/ambiguous faces even after cached admission. The source-owned receipt derives expected covers independently from the exact reviewed metric literal; returned rectangles alone are not authority.

The additive Mac carrier adapter executes a one-shot MainActor AppKit/WKWebView helper before expensive native compilation, with nonPersistent storage and an exact frozen loopback frontend closure. Nonce/frame checks, bounded owned process groups and finally teardown prevent lingering helper/compiler/server processes. The receipt binds reviewed source/frontend/fixture/policy/helper bytes and actual helper architecture, WebKit framework version, OS and observed cases; Node's architecture is recorded separately. Worker and independently extracted pair validation require the same source-bound success and exact actual app notice resources. Existing LaunchServices, signature, deployment, DMG, piano and native tests remain mandatory.

Chromium source observations and package/notice checks do not certify WKWebView or WebView2. Actual Mac compile/paint and Windows installed font loading remain delivery gates. The isolated WK probe uses temporary loopback HTTP, rather than Tauri's custom origin/CSP; it covers only the executed host architecture and does not establish minimum-OS or physical acceptance.

## Risks / Trade-offs

- Historical retention text may be ambiguous → recognize only known generator records; return conflict for unknown authority rather than broad deletion.
- Complete identity adds archive fields → keep them optional for historical reading and validate every new field on admission.
- Different hands make old layer history incompatible → retain whole editions and their journals; do not expose them through the new edition's finger-only history menu.
- Source projection accidentally exempts unrelated edits → validate exact ISO provenance and immutable remaining facts; use source mutation controls.
- Concurrent native delivery may use other reviewed inputs → preserve its checkout/services and require an actual coordination boundary before activation.

## Migration Plan

1. Review this companion plan and implement authority, passive identity, history and transaction gates against the retained dependency without enabling unsupported changed-hand output.
2. Integrate only the exact reviewed ISO implementation/recipe and update `dependencyRevision` while retaining original `sourceRevision`. Run source-pin validation, focused/full tests and build.
3. Inspect complete real-engine fixture pages and focused passages, preserve dense controls and report mathematical/visual limits. Prepare the scoped PR with exact combined inputs for parent review.
4. Coordinate native activation with the active delivery owner. Rollback selects retained package/state/recipe and preserves source, journals and practice. No separate release dispatch or unsafe service change is inferred.

## Open Questions

Exact new ISO recipe/provenance exports and reviewed merged revision are pending implementation evidence from its authorized owner. They determine adapter details without changing ownership, admission or retention requirements. Native activation timing depends on the existing delivery boundary and is not permission to interfere with it.
