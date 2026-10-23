## ADDED Requirements

### Requirement: Optional native piano sound
The viewer SHALL bundle the reviewed native SFZ engine without the sample bank and SHALL provide an optional piano, initially disabled, through the existing shared native output. Native MIDI SHALL reach the engine before frontend delivery while assessment, bindings, sustain and cues retain their contracts.

#### Scenario: Disabled or unavailable bank
- **WHEN** Piano is disabled or no admitted bank is ready
- **THEN** no piano engine sound starts, MIDI and existing viewer behavior remain usable, and the UI explains installation or state clearly

#### Scenario: Enabled connected keyboard
- **WHEN** an admitted bank is enabled and the player explicitly connects MIDI
- **THEN** the native host renders the original live bank through the selected shared output without frontend synthesis or a forced device/driver/MIDI change

### Requirement: Original offline bank admission
The installer SHALL admit only an exact approved archive identity into a private native app-data cache: the original V6.2 archive or the author's current V6.2a 48 kHz/24-bit replacement, each pinned by size, SHA256, canonical file fingerprint and live SFZ hash, and installed under its own profile prefix. An already admitted bank of either identity SHALL remain valid. It SHALL stream all copying/hashing/extraction, validate paths, symlinks, bounds, CRCs, per-file hashes and local SFZ/sample closure, retain original content/licenses, and atomically publish only a complete bank.

#### Scenario: Valid original archive
- **WHEN** Download piano finishes, or Install from a file… selects an unchanged archive matching an approved size/SHA256
- **THEN** a native worker verifies and installs all original files with the verified live SFZ and local samples, and the bank subsequently works offline

#### Scenario: Failure or cancellation
- **WHEN** admission, disk space, reading, CRC, closure or publication fails, or cancellation is requested
- **THEN** partial staging is removed, any existing admitted bank remains available, and clear status permits a later retry

#### Scenario: Unsafe or changed ZIP
- **WHEN** a ZIP has a different identity, unsafe/duplicate paths, symlinks, unsupported member type or excessive entry/size bounds
- **THEN** it is rejected before publication and no arbitrary filesystem path is written

### Requirement: One-press piano download
Options SHALL offer one Download piano button before installation. One press SHALL download the fixed current archive over HTTPS with the system curl, show progress for downloading, checking and installing, and admit it through the same installer, with no browser, file picker or second button. Cancel SHALL stop the download and discard it. An interrupted download SHALL be kept and continued by the next press; a refused server answer, a changed archive or a full disk SHALL be reported in plain words. The finished download SHALL be moved, not copied, into staging so only one archive occupies the disk. After a successful install the piano sound SHALL be switched on; MIDI SHALL NOT be connected automatically. Install from a file… SHALL remain a secondary offline path using a native ZIP picker without passing bank bytes or arbitrary filesystem paths to the frontend.

#### Scenario: One press
- **WHEN** the player presses Download piano with no bank installed
- **THEN** the archive is downloaded, checked and installed with visible progress, the piano is switched on, and it works offline afterwards

#### Scenario: Interrupted, cancelled or changed download
- **WHEN** the network drops, the player cancels, or the download differs from the pinned archive
- **THEN** a network drop keeps the partial download for the next press, cancel discards it and says so, a damaged download of the right size is discarded and fetched whole once, a changed archive is discarded and refused as needing a viewer update without fetching it again, and any installed bank and the preferences are unchanged

#### Scenario: Nothing left behind
- **WHEN** a piano is installed by either path
- **THEN** no unfinished download or its records remain for any admitted archive, the bank it replaced is removed, and a bank folder without a pointer is removed on the next start or press

#### Scenario: Already acquired original download
- **WHEN** the operator has an existing local approved ZIP
- **THEN** Install from a file… enters the same installer path without another Internet download or adopting an unvalidated extracted directory

### Requirement: Clear additive piano settings
Options SHALL show Piano in its own section below Audio/MIDI and above Keys and pedals with installation/status, an optional toggle, a compact centered percentage volume spinbox with a pointer-only drag track and a compact four-choice Latency setting requesting monotonically increasing host tiers. Actual device periods MAY coincide. Browsing arrows SHALL navigate Options without adjusting sound; entered control editing SHALL own adjustments. Volume SHALL reuse the shared centered percentage spinbox with entered typing/arrow editing and stacked mouse chevrons. Latency SHALL offer four discrete choices through one browse stop and entered arrow editing. Preferences SHALL be additive, disabled by default, and preserve existing records and settings. Installation SHALL NOT connect MIDI automatically; only the one-press download switches the piano on after it succeeds. Volume SHALL be available before installation and while the piano downloads. A Metronome volume, the same number box and track, SHALL sit under the piano's Volume at all times, set the metronome and practice cues with or without the piano, be heard while its track is dragged and be saved on release. A metronome volume not yet chosen SHALL mean 70%, and settings saved without it SHALL read unchanged.

#### Scenario: Controls before installation
- **WHEN** no native bank has been admitted
- **THEN** only Download piano, Install from a file…, Piano volume, Metronome volume and necessary installation status/cancel appear in the piano section, shared Audio/MIDI stay available, and piano controls/help and sampler loading remain absent

#### Scenario: Saving and reopening Options
- **WHEN** the player changes Piano, volume or latency and reopens Options/restarts the app
- **THEN** saved valid choices are retained, the effective enabled state depends on bank readiness, and unrelated settings/data remain unchanged

### Requirement: Audible piano level without clipping
At the default 70% a hard middle C SHALL peak around −6 to −3 dBFS. Each volume track SHALL map its setting to a gain on a smooth curve with 100% 6 dB above 70%; a saved piano volume SHALL never be quieter than its earlier linear gain. The final mix SHALL pass a peak limiter that looks no samples ahead, holds every frame at or below −1 dBFS and leaves frames under that ceiling exactly unchanged.

#### Scenario: Loud pedalled chord
- **WHEN** both hands strike a fortissimo chord twice with the pedal down at the default volume
- **THEN** the output peaks at −1 dBFS, the limiter reports the frames it lowered, and the delay per latency setting is unchanged

#### Scenario: Delayed-sound help
- **WHEN** the player opens Sound feels delayed?
- **THEN** compact help uses short relevant-platform sections to describe wired versus Bluetooth output and higher/lower settings without RAW jargon or default diagnostics, and includes enhancement steps only when internally needed and manufacturer/compatible HD Audio driver guidance with restoration steps, possible microphone/manufacturer-feature consequences and a primary Microsoft link, and makes no physical latency measurement or unobserved 44.1 kHz claim

#### Scenario: Help keyboard ownership
- **WHEN** help is open and Escape is pressed
- **THEN** only help closes and focus returns to its opener, leaving Options and installation intact

#### Scenario: Playing while minimized
- **WHEN** an enabled connected keyboard is played while the viewer loses focus or is minimized
- **THEN** native piano continues independently of frontend assessment focus gates, while genuine disconnect/reset/overflow safely clears voices

### Requirement: Owned Mac shared buffer adjustment
The Mac Latency setting SHALL adjust only the selected output’s settable shared HAL buffer within its legal range. The host SHALL stop the stream before changes and restore the previous buffer on disable, output change, reconfiguration and normal exit only if the device still holds the host-owned requested value. Sample rate, output format, default device and drivers SHALL remain unchanged.

#### Scenario: Shared buffer ownership
- **WHEN** the player chooses a Mac Latency tier and later disables piano or exits normally
- **THEN** actual queried buffer and any fallback/restoration error are reported, the prior buffer is restored while still owned, and help explains the temporary effect on other apps using that output

### Requirement: Reviewed native delivery and preservation
The combined source, engine/license closure and paired native build SHALL be independently reviewed before activation. Delivery SHALL preserve existing app identity, scores, progress, corrections and settings and SHALL distinguish installed-bank/stream evidence from physical MIDI/audio acceptance.

#### Scenario: Paired replacement build
- **WHEN** the integrated piano build is delivered
- **THEN** Windows and Mac package inputs, engine/bank identity, notices and observed integration are recorded, and physical acceptance is reported only after the operator performs it

### Requirement: Bounded native piano render lookahead
The Windows shared output SHALL distinguish packet storage capacity from queued render lookahead. It SHALL prime and refill only to the explicit selected-tier target `min(capacity, (tier + 1) * actualPeriod)`, without changing legal period selection or automatically escalating the tier. MIDI and panic ingress SHALL be checked at each sampler quantum within one bounded transfer-wide message budget. Prepared-cue admission SHALL retain actual submitted and in-flight horizons.

#### Scenario: Lowest tier with larger allocated capacity
- **WHEN** a stream has a 512-frame actual period, 1126-frame capacity and lowest latency selected
- **THEN** its render target is 512 frames, every refill fits actual available space, and already queued PCM is neither flushed nor extended to unrelated capacity

#### Scenario: Coincident engine periods
- **WHEN** the selected output exposes the same actual engine period for every latency tier
- **THEN** higher tiers add bounded queue headroom until capacity is reached, without changing the saved tier silently

#### Scenario: Actual source and loopback evidence
- **WHEN** the root-controlled diagnostic compares the admitted piano on the same endpoint
- **THEN** native note before/after enqueue brackets, source PCM, actual padding/service and correlated loopback timestamps are retained with quiet/signature controls over both sample-index and timestamp-window overlap, fine-timing failures are preserved separately from independently admitted coarse intervals, and software evidence is not represented as physical MIDI or sound-to-ear acceptance
