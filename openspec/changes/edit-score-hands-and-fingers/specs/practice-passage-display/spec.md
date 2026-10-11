# Spec Delta

## MODIFIED Requirements

### Requirement: Clear selector and practice settings presentation
Selector rows SHALL retain achieved-speed percentages and genuine completion evidence while omitting redundant visible Not yet completed wording. Shared tempo controls SHALL place small up/down chevrons vertically inside the numeric box's right edge and reserve space for their focus borders without overlapping the entered value or neighboring controls. Numeric values SHALL be centered in slightly narrower boxes; the three Practice numeric boxes SHALL align in one column regardless of external unit length. `%` and the beat-unit marking SHALL remain outside the numeric box. Visible absolute per-minute units SHALL consistently use `/min`, with spelled-out accessible labels. Full-score Performance controls and execution SHALL be absent; historical records SHALL remain retained. Practice Performance target SHALL remain absolute, and retained practice tempo controls SHALL preserve their existing admission, clock and record meaning. Mouse adjustment behavior and established field-specific increments SHALL remain available. Performance-target explanations SHALL agree with the displayed metronome marking and identify the reference for percentage controls; No helper text SHALL offer full-score note/timing assessment outside section Reading/Timed. Fresh and retained practice increase values and achievements SHALL retain their current admitted behavior; removing full-score assessment SHALL NOT change speed settings.

#### Scenario: Uncompleted selector row and focused tempo decrement
- **WHEN** an uncompleted group is shown in the selector or a tempo decrement button receives focus
- **THEN** the row communicates progress without redundant incomplete-status wording
- **AND** the down chevron sits below the up chevron inside the numeric box's right edge, with its focus border in its own visible space without covering the entered value
- **AND** the percentage or metronome unit remains outside the numeric box

#### Scenario: Target marking and fresh increase
- **WHEN** a fresh practice state opens the Practice section in Options
- **THEN** its increase per success retains the current application default and its performance target retains the metronome marking
- **AND** the explanation identifies that tempo as the reference for speed and increase percentages
- **AND** reopening a retained state preserves its saved exact increase and achievements

#### Scenario: Compact shared tempo units
- **WHEN** practice targets, absolute score references or shared metronome markings are displayed
- **THEN** the visible unit reads `/min` and assistive technology receives the equivalent spelled-out per-minute meaning
- **AND** the inline number retains its normal text baseline, the beat symbol sits slightly lower for balanced visual mass beside the number, and slash and min are separately spaced elements with air on both sides of the slash
- **AND** the beat duration and exact stored rate retain their existing musical meaning

#### Scenario: Performance tempo relative to score reference
- **WHEN** an existing saved score contains full-score Performance tempo or accuracy records
- **THEN** those historical records remain retained without exposing a full-score Performance start or grading control
- **AND** section practice keeps its genuine score reference, selected rates and numeric controls
