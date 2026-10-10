## Context

Installed Viewer d7dc1e32 and current source have the same defective practice geometry. Actual browser probes reproduce a 15.83% Schumann scale reduction on measured Start. Tail allocation can return fewer resident bars and remove their structural frames. The active key handler acknowledges Up/Down without adjusting speed. Practice defaults store absolute 10 BPM rather than 10% of the target. Existing musical grid V2 admits exactly one source-meter count-in bar.

## Goals / Non-Goals

Goals: unblock dependable practice; preserve source-faithful internal engraving, protected current-measure geometry and musical evidence; make keyboard operation a delivery gate; provide a useful metric cue at startup and every repeat.

Non-goals: redesign source notation, change sampler/device policy, certify physical performance, or couple urgent delivery to unfinished GP/TAB adoption.

## Decisions

1. Selected passages of at most four bars use one complete-source stationary fit established before Start. MIDI/manual modes share geometry. The measured retirement ledger remains authoritative for owned ink and held cues. Longer selections retain atomic source-faithful refill with the current measure pinned. Subset requests cannot delete staff frames; terminal windows retain bounded real source residency.
2. Current speed state uses integer half-percentage units relative to the target. Fresh start is 10%; restored current controls snap to this lattice. Raw best/manual attainment and history stay exact. The native minimum tempo can impose a truthful nearest legal lattice floor for exceptionally slow score references. Live edits queue: the attempt captures its actual rate, and its completed evidence uses that captured rate.
3. Introduce a strictly dispatched musical grid V3 with countInBars (1–8, default 2). Source entry occurs after countInBars times the entry bar plus the exact phase-alignment prefix. Compound meter receives a coherent primary/secondary/subdivision accent pattern. Legacy V2 remains literal, and unrelated Performance mode retains its policy. Browser and native scheduling use the same admitted immutable pulse facts.
4. Default resume cooldown is three seconds (Options 0–30). Resume remains guarded while a subtle centered lock communicates remaining time. Timers clear on expiry, close and changed attempt ownership; no delayed callback resumes music.
5. Keyboard ownership is explicit throughout selector, active practice, Options, edit drafts and binding capture. Plain active Up/Down adjust working speed by 0.5%; Options browse Up/Down changes focused rows and edit Up/Down changes a draft. Mouse chevrons add no keyboard stops. Saved bindings, modifiers and capture retain priority. Free view navigation inherits reader settings; Space/V/Enter/Esc keep their established contexts.
6. Build exact musical equivalence classes from source facts, not display names or approximate pitches. A repeated sequence of identical child classes (A+A) shares A's evidence; heterogeneous ordered classes remain independent. Include manual is a provenance filter over existing records. Raw keys/journals remain retained, and undo removes only the applicable manual claim across an equivalent class.

## Risks / Trade-offs

Shared files require narrow ownership and combined review. No source tests alone prove usable native practice. Metric phase and tempo capture must agree across TypeScript and Rust. Equivalence must reject differences in timing, rests, ties, hands, reference or ordered heterogeneous components. Separate scoped source commits allow a repair-only delivery at the installed dependency if unrelated main features lack receiving-platform acceptance.

## Migration Plan

Land independently reviewed scoped repairs through ordinary PRs, integrate against the exact source head, and run combined tests/build plus real-browser flows on retained Schumann and Zelda in both keyboard layouts. Select and review the exact delivery source only after dependency reconciliation. Freeze frontend/native inputs, obtain the ordinary complete Windows/Mac pair, freshly preserve the user's current install/data, validate recipient identities, activate additively and inspect actual Windows practice. Retain previous packages and all original data. Stop temporary task processes.

## Open Questions

No additional user decision is required. Selection of the final delivery base follows concrete compatibility and platform-gate evidence.
