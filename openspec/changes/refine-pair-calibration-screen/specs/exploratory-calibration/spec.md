## MODIFIED Requirements

### Requirement: Five reported effort grades
The new protocol SHALL use six ordinal stretch grades: 0 none/barely detectable, 1 a little, 2 moderate, 3 large/little room, 4 only just reachable, 5 unavailable. Every prepared displayed contact SHALL accept the player's actual grade, including 5 before a reachable baseline. Historical effort meanings SHALL remain unchanged.

#### Scenario: Report a grade
- **WHEN** grade 4 is entered under the new protocol
- **THEN** it records reachable stretch and does not terminate the sweep without an explicit maximum

#### Scenario: First contact unavailable
- **WHEN** the first displayed contact is rated 5
- **THEN** the actual unavailable report is saved without a fabricated reachable result or outward terminal, and the player can choose another starting contact

#### Scenario: Actual outward boundary
- **WHEN** grade 5 is reported outward of an earlier actual reachable result
- **THEN** the terminal links both actual reports while smaller untested contacts remain unknown

## ADDED Requirements

### Requirement: Pair measurement presentation and navigation
The pair screen SHALL use static-contact instructions, omit technical target summaries, and keep its complete rating controls clear of the footer. Left/right SHALL navigate adjacent finger pairs without manufacturing ratings or omissions. Model and editable controls SHALL retain ownership of their input.

#### Scenario: Leave a pair unanswered
- **WHEN** the player moves right then left without rating a pair
- **THEN** that pair remains unmeasured, its target is recoverable and any earlier observations remain unchanged

#### Scenario: Rating area at a short viewport
- **WHEN** the pair screen is displayed at 1280×720 or a narrow viewport
- **THEN** every rating remains fully visible or reachable by unobstructed body scrolling without a stock scrollbar

### Requirement: Explicit keyboard camera mode
The model SHALL provide a clearly indicated keyboard rotation mode with compact controls. While active, arrows rotate, plus/minus zoom and Home resets; Escape SHALL leave the mode. Camera changes SHALL preserve targets and recorded evidence.

#### Scenario: Return to measurement navigation
- **WHEN** the player turns keyboard rotation off or leaves it with Escape
- **THEN** left/right can navigate measurements again without changing any camera or measurement data accidentally
