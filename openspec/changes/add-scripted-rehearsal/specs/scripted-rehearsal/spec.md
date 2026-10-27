# Spec Delta

## Purpose

A committed, repeatable rehearsal of the built score viewer that walks every score the library holds, the way a player would, and tells pass or fail by invariants rather than by stored pictures, so every completion and delivery is checked the same way.

## ADDED Requirements

### Requirement: The rehearsal runs from the repository on public scores by default
`npm run rehearse` SHALL build the application from the checkout and rehearse it against a simulated native host, using only the public scores the repository carries (its fixtures, its review scores, the reference scores the viewer can prepare, and an authored score for another instrument). It SHALL need no network, no CI and no GitHub workflow, and SHALL write its copies and reports only outside the repository.

#### Scenario: Default run
- **WHEN** a developer runs `npm run rehearse` in a clean checkout after installing dependencies
- **THEN** the public scores are imported into a fresh data directory under the scratch directory, rehearsed, and a JSON report and a markdown summary are written beside it
- **AND** the command exits non-zero exactly when an invariant fails

#### Scenario: A new public score is covered without changing the rehearsal
- **WHEN** a `.tuna` fixture or an ISO reference score is added to the repository
- **THEN** the next default run imports and rehearses it without any edit to the rehearsal

### Requirement: Owner data is rehearsed only from a local copy and never published
With `--data <path>`, the rehearsal SHALL copy that directory into the scratch directory and work only on the copy. It SHALL refuse a data path or report path inside the repository. Its summary SHALL name scores only by kind, letter and library id, never by title, and SHALL carry no fingerings, pictures or score content.

#### Scenario: Owner data run
- **WHEN** `npm run rehearse -- --data <copy of the laptop data directory>` runs
- **THEN** the given directory is unchanged afterwards
- **AND** the summary lists scores as "piano score A (<id prefix>)" or "other score A (<id prefix>)"

### Requirement: The application declares its state for scripts
The application SHALL declare on its root element, without any visible change: the screen (startup, library, reader, practice), the open dialog's kind, the open score's library id, whether it is a piano score, the keyboard layout, the practice step (fingers, sections, manual), the section being practised, and why it is busy (startup, a score opening, a press waiting, practice starting). It SHALL count each command it runs and each failure it reports.

#### Scenario: Practising a section
- **WHEN** the player opens a piano score, presses P, chooses Sections and enters a section
- **THEN** the root element declares screen `practice`, step `sections`, the score's id and that section's id, and declares no section again after Esc returns to the list

#### Scenario: A press that waits
- **WHEN** a command is pressed before what it needs is ready
- **THEN** busy includes `press` until the command runs or is cancelled, and the command's run count rises by one when it runs

### Requirement: The rehearsal drives the application only through its own keys
The rehearsal SHALL press the keys the application assigns (the player's saved controls and the reader's command table) through the full application, and SHALL learn where it is only from the declared state, never from on-screen text or pixels.

#### Scenario: A rebound control
- **WHEN** the owner data assigns Fingers display or Edit to another key
- **THEN** the rehearsal presses the assigned key

### Requirement: Every score is rehearsed in both layouts against invariants
For every score in the library and both keyboard layouts, the rehearsal SHALL open and reopen the score, and for every piano score open Fingers through to its last measure and enter every listed section. It SHALL fail when: a score does not open or reopen; pages are missing; a piano score offers no practice, Fingers does not draw, or a section cannot be entered or draws nothing; an error or refusal is shown; a score for another instrument offers practice; or the page raises an uncaught error.

#### Scenario: A section refuses
- **WHEN** entering one section shows a drawing error
- **THEN** the run fails and names the score label, layout and section

#### Scenario: A score for another instrument
- **WHEN** P is pressed on a score that is not for piano
- **THEN** neither the practice menu nor practice is shown, and the rehearsal passes that check

### Requirement: An early press runs exactly once
The rehearsal SHALL press P, E and F at moments swept around the opening dialog leaving, measure each press against the moment the dialog left, and fail when a press made after the dialog left runs zero or two times, or any press runs twice. Presses made while the dialog still showed are reported with how many ran.

#### Scenario: Press at the paint
- **WHEN** P is pressed within a frame of the opening dialog leaving
- **THEN** the practice menu's command runs exactly once

### Requirement: Timings and pages are reports, not gates
The rehearsal SHALL record, per score and layout, the first open, the reopen, the layout change where one happened, Fingers' opening, the number of sections and section entry times, and the page count, in the report and the summary. None of these SHALL make the run fail.

#### Scenario: A slow first open
- **WHEN** a score's first open takes far longer than before
- **THEN** the summary shows the time and the run still passes if every invariant holds
