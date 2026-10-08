# Native delivery from the extracted viewer

The application remains owned by this repository. The existing authenticated paired Windows/Mac workers live in ISO. Their unchanged workflow expects `score-viewer/package.json`, `score-viewer/src-tauri/` and ISO release scripts; it cannot build this repository merely by dispatching a viewer revision.

`scripts/create-native-release-carrier.mjs` prepares an isolated ISO **delivery carrier** at the viewer's exact notation pin. It copies only the final viewer's native shell, package/lock and license files, plus a frozen frontend that has already passed source and browser review. It does not copy or rebuild the viewer TypeScript in ISO, change authentication/workflows, modify the source checkout or activate an installation. A generated carrier is independently reviewed through a temporary ISO PR before dispatch, rather than merged over the legacy application main tree.

The carrier's own commit is the unchanged workflow's `source_revision` checkout input and the pair's `sourceRevision`. Every package and native executable additionally binds the exact `hypermemetic-ai/score-viewer` revision/tree, `hypermemetic-ai/iso-notation` pin, native inventory, original frontend inventory and source-check receipt. Do not describe the carrier commit as the application-source commit. `Source-provenance.json`, `Source-validation.json` and `Release-identity.json` travel in both recipient packets.

Use a clean final viewer checkout and a clean task-owned ISO worktree checked out at the declared notation pin:

```sh
node scripts/create-native-release-carrier.mjs \
  /absolute/clean-viewer FINAL_VIEWER_SHA \
  /absolute/frozen-dist /absolute/source-checks.json \
  /absolute/isolated-iso-carrier
```

The checks file must bind the same final source and frontend. Calculate `frontendDigest` as SHA256 of the canonical sorted `{path: {sha256, size}}` inventory (`inventory` and `canonical` from `scripts/native-release-carrier/inputs.mjs`). It must contain:

```json
{
  "schema": 1,
  "viewerRevision": "FULL_FINAL_VIEWER_SHA",
  "notationRevision": "FULL_PINNED_ISO_SHA",
  "frontendDigest": "SHA256_OF_SORTED_FROZEN_FRONTEND_INVENTORY",
  "checks": {
    "tests": {"status": "passed"},
    "build": {"status": "passed"},
    "browserInspection": {"status": "passed"},
    "independentReview": {"status": "passed"}
  }
}
```

Include actual counts, artifact receipts and review references in those check objects. This receipt records observed evidence; it does not create evidence from status labels. Never create it before the final reviewed source, configured build and browser checks have completed.

The generator rejects dirty/wrong source checkouts, stale checks/frontend, mismatched gitlink/provenance, symlinks (including the frontend directory itself) and unsupported script adaptation anchors before changing the carrier. Carrier-only Git attributes preserve exact copied native/package/license and frozen-input bytes across Windows newline conversion; existing attributes are retained. Preparation verifies frozen/native inputs, adds one source-bound embedded release asset and produces the existing exact Tauri/Brotli probes. Native workers revalidate native files and source identities before compiling. The original Windows native tests, universal Mac tests/virtual MIDI, signature/resource/13.3 deployment checks, exact DMG/app parity and available direct/normal OS launch checks remain enabled. Pair assembly independently proves all frozen assets inside Windows and both Mac slices. The existing atomic private publication operation remains the only current-download update.

Run the existing release command **from the generated carrier checkout** so it imports the adapted source-identity validator. The unchanged validator in an ordinary ISO checkout deliberately rejects the new embedded identity. Keep the workflow definition on its existing `main` ref and supply the reviewed carrier commit as its checkout input:

```sh
node scripts/release-score-viewer.mjs \
  --repository hypermemetic-ai/iso-notation --ref main \
  --revision REVIEWED_CARRIER_SHA \
  --score-path public/review/schumann-no14-conventional-20261006.isoscore \
  --score-sha256 2ffc820dc1f57ba45249331c68671d82e71ea7edd0edc284fcbc03d90fd5584d \
  --output /home/qqp/projects/iso-notation-deploy/public/review/score-viewer
```

The command obtains both native packages, independently verifies the complete pair, and changes the current download pointer atomically. Recheck that the selected carrier is a descendant of the then-current paired revision; an unrelated or older finishing pair is rejected and the current download stays intact. An existing complete artifact can be reused only after identical source/score and package verification. Retain actual preparation/native/assembly timings and cache context in the delivery receipt.

A later Windows activation is a separate operation: reverify the laptop and console identity, preserve the running package/data/shortcut, install additively, verify package identity, switch the usual shortcut and inspect the native viewer. Keep the emergency rollback package and backup. Native/package/startup evidence does not establish physical MIDI/audio/pedal or pianist acceptance.
