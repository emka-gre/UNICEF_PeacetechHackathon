## Purpose

Gives Laaha staff a restricted internal tool to review, tag, and verify incoming reports and to export anonymised aggregate data that respects each reporter's consent.

## ADDED Requirements

### Requirement: Role-restricted access
The dashboard SHALL require staff sign-in. Access SHALL be limited by role: "moderator" can view and moderate reports; "admin" can also manage partner data, resource guides, staff accounts, and exports. Users of the public app SHALL have no access.

#### Scenario: Unauthenticated access blocked
- **WHEN** someone who is not signed in as staff opens the dashboard
- **THEN** the system redirects to staff sign-in and shows no report data

#### Scenario: Moderator cannot export
- **WHEN** a moderator attempts to run a data export
- **THEN** the system refuses the action

### Requirement: Moderation queue
The dashboard SHALL list reports with their status (pending, verified, rejected, needs more info), category, platform, and submission date, and SHALL let staff filter by each of these. New reports SHALL appear with status "pending".

#### Scenario: Filter pending reports
- **WHEN** a moderator filters by status "pending" and platform "Instagram"
- **THEN** only pending Instagram reports are listed

### Requirement: Review, tag, and verify
A moderator SHALL be able to open a report, view its evidence, change its status, correct its category, add free-text tags, and add internal notes. Every change SHALL be recorded in an audit log with the staff member and time.

#### Scenario: Verify a report
- **WHEN** a moderator sets a report to "verified" and adds the tag "election"
- **THEN** the report shows status verified and tag "election", and the audit log records who made the change and when

### Requirement: Access to evidence is logged
Each time a staff member views a report's screenshots, the system SHALL record it in the audit log.

#### Scenario: Screenshot view logged
- **WHEN** a moderator opens a report's screenshot
- **THEN** an audit entry records the staff member, report, and time

### Requirement: Anonymised aggregate export
An admin SHALL be able to export report data as CSV. The export SHALL include only reports whose reporter gave research consent and whose status is "verified". It SHALL contain only category, platform, month and year of incident, tags, and status. It SHALL NOT contain free-text descriptions, links, screenshots, notes, reporter details, or exact dates.

#### Scenario: Export excludes non-consenting reports
- **WHEN** an admin exports data and one verified report has research consent set to false
- **THEN** that report is not in the export

#### Scenario: Export contains no identifying fields
- **WHEN** an admin opens an exported CSV
- **THEN** it has no columns for description, link, screenshot, notes, reporter, or exact date

### Requirement: Manage resource guides
An admin SHALL be able to create, edit, publish, and unpublish resource guides. Only published guides SHALL appear in the app, and unpublished guides SHALL disappear from it on the next data refresh.

#### Scenario: Publish a guide
- **WHEN** an admin publishes a new guide and a user's app refreshes its data
- **THEN** the guide appears in the user's resource library

### Requirement: Aggregate overview
The dashboard SHALL show counts of reports by category, platform, and month, for a chosen date range.

#### Scenario: Monthly counts
- **WHEN** an admin selects the last 6 months
- **THEN** the dashboard shows report counts per month broken down by category
