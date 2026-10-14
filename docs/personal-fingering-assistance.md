# Personal fingering assistance

Personal choices automatically fill exact matching written measures, or the matching hand within a measure. Adding a previously unknown finger contributes shared knowledge. Changing a copied choice creates a local exception; changing its current reference updates matching copies. Existing conflicting personal choices remain local exceptions. Calculated suggestions and hand-only edits are not new personal finger decisions.

The editor shows Shared or Local for the selected personal choice. Make reference publishes the selected measure/hand's visible personal choices; calculated dispositions are excluded. Return to shared clears the local exception. Restore calculated temporarily selects calculated display without erasing the underlying shared or local knowledge. Undo restores the prior local disposition while retaining intervening shared changes. Suppressing a finger is distinct from restoring calculated display.

Space toggles Notes/Measures navigation while editing. Left/Right in Measures selects the first editable contact of the next nonempty written measure, including across pages; endpoints do not wrap. Up/Down still moves systems. Digit entry and Tab retain note movement. The toggle does not move the current selection. Practice keeps its own Space action. G visits the selected choice's reference; G again returns to the original score, source-linked selection, view and navigation mode. These actions use the existing context-aware binding system.

## Ownership and matching

The pinned `@hypermemetic-ai/fingering-editor-assistance` artifact owns exact rational measure matching, field resolution, decision provenance, reference succession and physical-travel classification. See `fingering-assistance-provenance.json`. The viewer owns source admission, effective-hand partitioning, physical-alias evidence, user intent, persistence and interface. The existing solver and notation dependency remain separately pinned. The editor-only artifact does not ship the abandoned calibration workflow.

Occurrence identities include source revision and presentation/profile binding; finger pattern matching may cross compatible profiles without treating physical contact geometry as interchangeable. Independent coincident notes are not inferred to be aliases. Only admitted physical aliases share a decision. Whole-measure and hand projections keep coherent linked decision lineage while independently authored exceptions stay protected. The current reference and original donor are distinct: deleting a reference transfers to the next oldest surviving occurrence and retains the donor and shared knowledge, including when no occurrence survives.

## Durable records and recovery

All assistance writes use `AssistanceStore` compare-and-swap revisions. Browser writers serialize through Web Locks. Native writers use an interprocess file lock. Immutable content-addressed documents and manifests are written before the single active-pointer replacement. A manifest binds the personal state, shared memory, applied-intent ledger and any migration receipt as one visible revision. Old objects and manifests remain available for recovery; no garbage collection is introduced.

`personal-fingering-memory` stores the versioned keyboard memories and occurrence registry. Personal documents use their exact existing logical storage keys. `personal-fingering-pending` retains captured source-bound intent before applying it. An applied-intent ledger prevents duplicate execution after uncertain acknowledgements. Retry replays intent against the latest compatible state, rather than writing a stale whole-state snapshot. Navigation saves merge only view fields. Invalid source or personal bindings fail closed and retain pending work for recovery.

A companion version-2 personal document may rebind to a rebuilt presentation revision only when its complete source/layout/profile/effective-hand binding matches and all personal/layer guards admit the rebound record. An unrelated edition never receives an arbitrary old snapshot. Immutable prior versions remain retained.

The normal first index scans active library archives and current personal journals. Retained editions, undo buffers and calculated layers are not historical donors. Known per-field authoring dates sort before unknown dates; unknown dates are not fabricated from import age. Stable identities break ties. Existing memory and personal documents remain authoritative after restart.

## Warnings

Warnings appear only in the editor, beside affected contacts, with the explanation on selection. They do not require acknowledgement or interrupt practice. The default absolute threshold is 25 cm/s, strictly exceeded; Options persists a positive finite threshold and independent absolute/personal-unusual switches. Personal unusualness needs at least 20 independent comparable decisions and a result above the 95th percentile. Inherited copies and the assessed decision cannot inflate that evidence.

Analysis follows performed visits, actual admitted rows, source reference tempo and release/hold constraints. Missing physical geometry or timing creates an unassessed gap. Conventional-piano warning geometry is currently unassessed unless an admitted millimetre profile is supplied; key-width units are not silently converted to physical distances. Revision changes cancel obsolete analysis. The personal corpus uses actual donor contexts and is derived from the complete active library, never from copies presented as independent decisions.

## One-time consolidation

Consolidation requires an explicit source-bound request in assistance document `personal-fingering-consolidation-request`. It specifies version 1, selected entry IDs, a unique receipt ID, source revisions and explicit personal keys when needed. The application consumes it only at startup before opening a score or practice, after pending work is drained. There is no hard-coded piece name.

The authorized target uses earliest saved field decisions over the union of admitted whole/hand equivalences. This exceptional one-time operation may admit ambiguous legacy saved fingers; ordinary imports remain conservative. It records chosen donors, replaced values, input hashes and an idempotent completion receipt, together with the original memory/personal documents and prior manifest. A changed source, journal or library snapshot aborts activation. Reusing a completed receipt does not erase later local exceptions. Unrelated pattern references remain unchanged.

The private Schumann snapshot/report remains outside Git. Preparing that report or rendering a local candidate is not live migration. Native activation requires the actual app's safe boundary and current input validation; externally replacing an active journal is not supported.
