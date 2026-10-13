# Design

## Context

The user has specified the changes and authorized implementation without another design interview. Existing durable ledgers can represent grade-5 observations independently from sweep terminal records.

## Goals / Non-Goals

Goals: implement the pair-screen feedback while retaining actual observations, clear keyboard navigation and usable rating controls. Preserve geometry, instrument setup, other phases and historical data.

Non-goals: introduce a new protocol, fit anatomy or personalized fingering costs, or reinterpret unknown contacts.

## Decisions

- Save every actual unavailable response with no contact realization. A smaller prior reachable observation is required only for a first-unavailable terminal. Before such a reachable result exists, the player may select another starting contact without manufacturing progress.
- Left/right browse adjacent finger pairs. Unanswered pairs stay unmeasured; cursor navigation preserves reports and their original target identities. Model/editable/picker input owns its keys first; pending writes and held navigation cannot race advancement.
- Keyboard rotation is an explicit mode. Its arrow, zoom/reset and Escape actions operate on the model, then return control to measurement navigation. Camera presentation remains separate from saved geometry.
- Remove technical summaries and use compact square camera controls. Keep the full rating area in the scrollable body with sufficient separation from the fixed footer; responsive sizing must be observed at common desktop and narrow widths.

## Risks / Trade-offs

Allowing first unavailable reports requires admitting them on reload and retaining baseline rules at terminals, rather than weakening all validation. Arrow navigation must not steal model/picker keys or fabricate omission records. Browser inputs and native entry-screen observations do not establish physical calibration acceptance.
