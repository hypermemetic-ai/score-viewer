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

The generator rejects dirty/wrong source checkouts, stale checks/frontend, mismatched gitlink/provenance, symlinks and unsupported script adaptation anchors before changing the carrier. Preparation verifies frozen/native inputs, adds one source-bound embedded release asset and produces the existing exact Tauri/Brotli probes. Native workers revalidate native files and source identities before compiling. The original Windows native tests, universal Mac tests/virtual MIDI, signature/resource/13.3 deployment checks, exact DMG/app parity and available direct/normal OS launch checks remain enabled. Pair assembly independently proves all frozen assets inside Windows and both Mac slices. The existing atomic private publication operation remains the only current-download update.

Once the complete reviewed pair passes validation, publication uses the carrier revision through the existing ISO release command and authorized private download directory. A later Windows activation is a separate operation: reverify the laptop and console identity, preserve the running package/data/shortcut, install additively, verify package identity, switch the usual shortcut and inspect the native viewer. Keep the emergency rollback package and backup. Native/package/startup evidence does not establish physical MIDI/audio/pedal or pianist acceptance.
