# Fast personal editing validation

The [production browser benchmark](../scripts/check-fast-personal-editing.mjs) measures an actual keydown event through the first animation-frame callback containing the correct projected score. It serves the built production frontend under the application's CSP; native managed-file IPC is simulated in isolated browser storage. It reads and preserves public archive bytes and never uses the operator's managed library.

Its six cases combine Conventional piano and Jankó four-row presentations with the retained public Schumann No. 14, a newly authored 120-bar independent-voice study (480 source owners), and a public complete written-tie study spanning pages. Each case includes twenty hand edits across ten successive source selections, changing each hand and changing it back, followed by twenty finger edits with ordinary chronological advance. Opening and four preparation edits are reported separately. Every case and edit class must have correctly rendered p95 at most 100 milliseconds. Missing or failed samples fail acceptance, and the delayed-save rapid edit must also finish within 100 milliseconds.

Completion requires the entire visible SVG's geometric primitives, stable paint/font attributes, original text, all visible finger values and positions, effective hands, selected source alias, page and keyboard focus to match expected output. Expected geometry for every distinct hand map comes from independent full cold shared preparation, with a fresh transient session used only to resolve source-stable alias IDs. The benchmark neither uses a changed browser scene as expected output nor accepts a changed dataset or finger caption as a substitute for engraving. Benchmark authority identities describe isolated transient operator choices; no expected scene is archived as a calculator result.

The long source uses the ordinary shared source renderer and native publisher to create both admitted source presentations without a calculated finger layer; its warm edits therefore cover the required no-layer path. The first attempt to calculate a 480-owner finger layer exhausted the ordinary regression helper's 200,000-expansion bound before any browser case opened. That separate fixture-preparation failure is retained as diagnostic evidence; it is not a warm-edit timing result. No. 14 and the small tie fixture retain their admitted calculated finger layers.

After timing, native writes are blocked while a hand key and finger key are issued rapidly. The benchmark requires coherent latest notation before either write completes, stable owner intent, suppression of older projection publication and ordered saved snapshots. The simulated storage gate identifies the active journal by its source and keyboard binding, including a new journal staged during cold activation, rather than assuming the seed filename stays active. Library transitions expand the correct composer group through ordinary controls. It also injects a write failure, verifies further edits pause without losing the rendered intent, retries the retained snapshot through the ordinary UI, and checks source-bound notation after switching scores and reopening. Original archives remain byte-exact.

Run after the tracked shared source pin has been admitted:

```sh
/home/qqp/.local/bin/qq-job -- npm run build
PRACTICE_PLAYWRIGHT=/path/to/playwright-core/index.mjs \
PRACTICE_CHROMIUM=/path/to/chrome \
FAST_EDIT_ARTIFACTS=/tmp/score-viewer-fast-personal-editing \
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/check-fast-personal-editing.mjs
```

The receipt retains source/frontend/fixture hashes, named host/browser/viewport, all successful and failed timings (including frame-callback arrival and correctness-verification overhead), sample counts, cold-opening time, correctness checks and screenshot names. Freshly generated public fixtures and screenshots remain in the artifact directory. At least twenty samples per class are enforced; `FAST_EDIT_SAMPLES` may increase the count.

Results must be read from an actual retained receipt. This document describes the acceptance method until a successful run is recorded. Browser-frame correctness is evidence for this frontend and host, not display scanout, physical keyboard timing, native WebView timing or human musical acceptance.
