# Score Viewer delivery Specification

## Purpose

Deliver one desktop Score Viewer consistently on Windows and Mac through a fast paired release operation with verifiable payload identity and recoverable private downloads.

## Requirements

### Requirement: Paired release operation
The standard release operation SHALL build Windows x64 and universal Intel/Apple Silicon Mac together. Merged changes to the viewer or its shared runtime/build dependencies SHALL trigger both builds. Platform workers SHALL NOT independently publish a current release.

#### Scenario: Shared viewer change
- **WHEN** a merged change affects fingerings, rendering workers, practice, settings or native viewer code
- **THEN** one workflow builds both platforms without a contributor requesting a second platform export.

#### Scenario: Explicit release request
- **WHEN** a contributor invokes the repository release command for a reviewed revision
- **THEN** that operation obtains both packages, verifies the pair and can publish them together without separate Windows and Mac procedures.

### Requirement: Common release identity
Both packages SHALL identify the same source commit, application version, unique release identity, prepared score input and shared frontend inventory with content hashes. Inputs SHALL be verified before building and again before paired publication. The prepared score SHALL retain its musical and presentation identities.

#### Scenario: Stale or mismatched input
- **WHEN** a package or receipt identifies another revision, frontend, version or score hash
- **THEN** pair verification fails and the current download remains unchanged.

### Requirement: Packaged frontend parity
Verification SHALL establish that the delivered native binaries contain the frozen frontend payloads, including worker and font files. Mac verification SHALL cover both architecture slices. Declared manifests alone SHALL NOT establish embedded payload parity; known packaging transformations SHALL be explicitly verified.

#### Scenario: New receipt on an old executable
- **WHEN** a newly labelled package contains an older embedded reader asset
- **THEN** release verification rejects the package even if its receipt claims the expected source revision.

### Requirement: Complete private publication
One private download index SHALL offer both packages under a common release identity. Current publication SHALL change only after all pair checks and file checksums pass. Failed, incomplete or corrupt pairs SHALL retain the last complete current release. Existing packages SHALL remain available and an older finishing build SHALL NOT silently replace a newer release.

#### Scenario: One native build fails
- **WHEN** Windows succeeds and Mac fails, or the reverse
- **THEN** no current release is published and the previous complete pair remains downloadable.

#### Scenario: Verified publication
- **WHEN** the complete pair is published
- **THEN** both download links resolve to checksum-verified packages of that release and the current index changes atomically after immutable files are ready.

### Requirement: Efficient iteration
Each new release execution SHALL build the shared frontend and run common viewer checks once, build independent native platforms concurrently, and reuse correctly keyed dependency and native compilation caches. Cache misses SHALL remain correct; cache reuse SHALL NOT bypass source, payload or native validation.

#### Scenario: Warm iteration
- **WHEN** a later viewer revision is built with compatible cached dependencies
- **THEN** unchanged native dependencies are reused, changed inputs are rebuilt and both packages still pass the same identity and native checks.

### Requirement: Measured release speed
Release evidence SHALL record preparation, native build/check, assembly and end-to-end elapsed times with cache-hit context. Delivery validation SHALL include comparable cold and warm paired runs, identify the critical path and report observed improvement without presenting host-specific timings as a guaranteed deadline.

#### Scenario: Performance evidence
- **WHEN** the paired workflow is delivered
- **THEN** cold and warm timings and bottlenecks are available, with queue time distinguished from build time and repeated or redundant build work identified.

### Requirement: Equivalent native practice behavior
Both platforms SHALL use the same metronome sample and count-in rules, request validation, stop/restart and cancelled-generation error behavior. Native device selection and playback-origin mapping SHALL remain platform-specific while exposing the same reader contract and preserving coherent MIDI/practice timing.

#### Scenario: Superseded audio start
- **WHEN** an old audio attempt times out or reports an error after cancellation or replacement
- **THEN** it stops and cannot pause or emit an error against the newer attempt on either platform.

#### Scenario: Shared cue sequence
- **WHEN** both adapters render the same tempo, count-in and duration at a supported sample rate
- **THEN** they use identical cue generation rules, preserving native output-clock mapping and local device routing.

### Requirement: Recipient compatibility and preservation
Packages SHALL remain usable offline with their declared platform requirements, notices and concise installation instructions. Release and publication operations SHALL preserve recipient libraries, corrections, practice history, preferences and MIDI routes. Installation and activation SHALL remain separate from creating a paired download.

#### Scenario: Download a new iteration
- **WHEN** a new pair is built or published
- **THEN** no existing application data, recipient installation or musical routing is overwritten or migrated by that operation.

### Requirement: Normal Mac application launch
Mac release verification SHALL test normal operating-system application launch when a suitable same-user desktop session is available. It SHALL validate the launched package and executable identity and stop only its owned instance. An unavailable desktop SHALL be recorded explicitly without claiming normal launch acceptance.

#### Scenario: Suitable desktop session
- **WHEN** the native Mac runner has a suitable same-user desktop session and isolated test-owned app data
- **THEN** it launches the verified app through the normal operating-system application path, checks its identity and bounded survival, and stops only the returned test instance.

#### Scenario: Desktop session unavailable
- **WHEN** the runner cannot safely exercise that application-launch path
- **THEN** its receipt identifies the unavailable check while retaining applicable native package and direct-startup evidence.

### Requirement: Native validation evidence
Both packages SHALL pass their applicable native shared-behavior checks and packaging integrity checks. Mac SHALL retain universal-slice, minimum-OS, signature/resource and virtual-MIDI checks. Receipts SHALL distinguish build/startup verification from interactive GUI, physical MIDI/audio/pedal and operator acceptance.

#### Scenario: Hardware unavailable
- **WHEN** a runner cannot exercise physical pedal or audio hardware
- **THEN** its receipt identifies the inspection limit without claiming physical acceptance or inserting engineering status into the application GUI.
