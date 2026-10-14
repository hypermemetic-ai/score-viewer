# Closed-app consolidation request staging

This delivery-only executable is uploaded separately from the Windows app packet.
It imports the production atomic assistance store directly. It does not apply a
consolidation, overwrite personal journals, or launch/close the viewer.

Build/test with `cargo test --locked --manifest-path scripts/assistance-stage/Cargo.toml`
and `cargo build --locked --release --manifest-path scripts/assistance-stage/Cargo.toml`.

After normal app closure, fresh complete preservation, verified additive install
and shortcut activation, run in the original Windows user's context:

```
viewer-assistance-stage.exe --managed-directory "%APPDATA%\dev.qqp.iso-score-viewer" --request request.json --request-sha256 SHA256 --library-sha256 SHA256 --expected-revision 0 --preservation-receipt preservation-receipt.json --preservation-sha256 SHA256
```

Replace every pin with a reviewed current value; revision 0 is only correct when
no assistance manifest exists. Keep stdout as the staging receipt. A nonzero exit
requires inspection before continuing; do not repeat with invented replacement
pins. The operation refuses another staged request, stale revision/library,
inactive personal keys, missing source bindings, wrong managed identity, or a
running viewer. Exact repeat requests are idempotent at the current revision.

The caller owns the closed-app boundary and must prevent launching another viewer
during this operation. Process inspection is a guard, not a lock on future app
launch. Stage after shortcut activation because earlier install/activation checks
expect all preserved data to remain unchanged. The application validates actual
score source revisions when it consumes the request on the next safe startup,
then atomically retains originals, current input hashes and its completion receipt.
The helper validates the request against the pinned current library; it does not
replace application archive/source admission or independently certify backups.
