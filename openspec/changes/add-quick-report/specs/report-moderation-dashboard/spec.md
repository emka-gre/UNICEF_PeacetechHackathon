## ADDED Requirements

### Requirement: Auto-filled reports are marked
The moderation queue SHALL show which reports were auto-filled from a quick report and SHALL let staff filter for them. For an auto-filled report, the suggested category SHALL be shown as a suggestion, not as a confirmed value.

#### Scenario: Filter auto-filled reports
- **WHEN** a moderator filters for auto-filled reports
- **THEN** only reports sent through quick report and not yet confirmed are listed, each showing its suggested category

### Requirement: Category confirmed before verification
A moderator SHALL NOT be able to set an auto-filled report to "verified" without first confirming or correcting its category. Confirming SHALL remove the auto-filled mark. Until then, the report SHALL NOT appear in the anonymised export or in the category counts of the aggregate overview.

#### Scenario: Verify without confirming
- **WHEN** a moderator tries to verify an auto-filled report whose category has not been confirmed
- **THEN** the system refuses and asks the moderator to confirm the category first

#### Scenario: Confirmed report is exported
- **WHEN** a moderator changes the suggested category of an auto-filled report from "Other" to "Harassment or pile-on", confirms it, and verifies the report, and an admin then runs the export
- **THEN** the export includes the report with category "Harassment or pile-on" and no auto-filled tag
