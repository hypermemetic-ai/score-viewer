# Disposable library practice summaries

`viewer-derived-cache-v1.json` is an optional managed file containing derived
library percentages and whole-piece badges. Deleting it causes a cold rebuild.
It never contains a score graph, a package-admission capability, a practice
state, or editable personal evidence. It never supplies evidence to Practice,
Reading, score opening, editing, export, or package validation. Those paths
continue to open the archive and authoritative journals independently.

## Integration

`LibraryPracticeReader` retains `readPackage` and `readRecord`. A host can opt in
with `readCache(file): Promise<Uint8Array | null>` and
`writeCache(file, bytes): Promise<void>`, wired through its managed storage. Both
cache methods receive only the exported `LIBRARY_DERIVED_CACHE_FILE` name. The
TypeScript and native allowlists admit that exact filename, without a new prefix
or path rule. Existing callers without cache methods retain cold derivation.

`LibraryPracticeSummaries.refresh(entries, keyboard, reader, isCurrent,
onProgress?)` reports `(completed, total)` initially and after each completed
entry, including unavailable entries. These callbacks do not publish partial
summary maps. The whole snapshot is published only while its generation and
foreground guard remain current. A progress callback can itself supersede the
scan. Callback failures do not discard evidence.

## Verified reuse

Each row binds:

- SHA-256 of the archive bytes actually reread for the selected entry;
- canonical JSON of the complete selected `Entry`, including archive, personal
  pointers, retained editions, selected transposition, and metadata;
- the selected physical keyboard and `LIBRARY_SUMMARY_POLICY`;
- every `readRecord` call actually made by cold derivation, including a null
  current record before a legacy fallback, personal fallbacks, manual reference
  tempo records, and visited manual-practice namespaces;
- the derived display summary (or a successful unavailable result), and a
  SHA-256 checksum of the canonical row payload.

A fresh owner rereads the archive and each contributing record. It compares
archive byte hashes and canonical parsed JSON record-content hashes; JSON
whitespace or property order does not change record content. A missing record
is stored explicitly as a null dependency. Adding it later, deleting an
existing record, or changing its content rejects reuse. No fallback namespace
list is independently invented by the cache: a decorated reader captures the
actual cold branch. A changed dependency takes the original cold derivation
path with fresh reads. Cache hits skip package admission and practice planning.

The policy value is `bounded-exercises-v1/library-summary-v1`. Change this value
when summary meaning, record selection, or derivation changes. A constructor
policy override supports controlled tests; it is part of the row identity.
The persistent checksum detects accidental row damage; it is not an
authentication mechanism or a source of musical authority.

## Bounds, faults, and ordering

The envelope permits at most 256 rows and 512 KiB. Each canonical row is at most
32 KiB; a cacheable entry context is at most 16 KiB; a row has at most 16 distinct
record dependencies. Record canonicalization is bounded to 8 MiB, 100,000 nodes,
and depth 32. Bounds are exported in `LIBRARY_CACHE_LIMITS`. Oversized entry
contexts or record content still take cold derivation, but are not persisted.
The retained memory table uses the same row and encoded-byte bounds. Older rows
are evicted first when either persistence bound is reached.

Envelope shape/version, UTF-8, row identity, filename shape, summary ranges,
canonical context, and checksum are validated. Invalid individual rows are
ignored without discarding other independently verified rows. A malformed or
oversized envelope, cache read error, absent cache, or cache write error falls
back without changing archives, source pointers, journals, or live evidence.
Corrupt authoritative records continue to suppress that summary through the
existing cold path; they are not repaired by this cache.

One `LibraryPracticeSummaries` owner serializes optional writes. A queued write
checks its generation and foreground guard before starting. An already running
host write is allowed to finish before a newer write; it cannot overtake that
newer write. `refresh` awaits its best-effort queued write, and `flushCache()`
provides an explicit lifetime barrier. Writes are disposable and their failure
does not roll back a published summary. Host storage retains responsibility for
its ordinary atomic file-write contract. This is not a cross-process lock.

Accepted `record` and `recordManual` updates invalidate background generations
and publish direct live evidence. `clear()` invalidates scans and queued writes,
clears local summaries and admission reuse, and does not delete saved data. An
in-flight cache write may finish after a live update or clear, but its rows must
still verify the actual journals before a later refresh can display them.
No background result can replace the newer live snapshot.

## Evidence and limits

Focused tests exercise restart hits with package admission forbidden, archive
and journal invalidation, missing/fallback additions and deletions, personal
pointers, transposition/edition contexts, layouts and policy versions, manual
reference/fallback dependencies, corrupt and bounded data, cache I/O failures,
complete progress, foreground/live supersession, and serialized deferred writes.
Exact native filename boundary tests run separately. These establish source
behavior; they do not certify an installed native application or human musical
acceptance.
