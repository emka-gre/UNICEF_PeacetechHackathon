## Purpose

Helps users find partner organisations (legal aid, counselling, shelters, digital-safety clinics) that match their needs, with contact details they can rely on even offline.

## ADDED Requirements

### Requirement: Partner directory entries
Each partner entry SHALL show: name, service types, address or "remote only", opening hours, languages spoken, and at least one contact method (phone, email, or website). Service types SHALL be drawn from: legal aid, counselling, shelter, digital-safety clinic, medical, other.

#### Scenario: View partner detail
- **WHEN** a user opens a partner entry
- **THEN** she sees its services, hours, languages, and contact details

### Requirement: Search and filter
The user SHALL be able to search partners by name or keyword and filter by service type and language. Search and filters SHALL work offline against cached data.

#### Scenario: Filter by service and language
- **WHEN** a user filters by service "legal aid" and language "Arabic"
- **THEN** only partners offering legal aid in Arabic are shown

#### Scenario: No matches
- **WHEN** a search returns no partners
- **THEN** the app says no results were found and suggests clearing filters

### Requirement: Map view
When online, the app SHALL show partners with a physical address on a map. The app SHALL NOT request the device location unless the user taps "Near me", and SHALL NOT send the user's location to the server.

#### Scenario: Map without location permission
- **WHEN** a user opens the map without tapping "Near me"
- **THEN** partners are shown on the map and no location permission prompt appears

#### Scenario: Near me
- **WHEN** a user taps "Near me" and grants location permission
- **THEN** partners are sorted by distance, calculated on the device

#### Scenario: Map unavailable offline
- **WHEN** a user opens the map while offline
- **THEN** the app shows the list view and explains the map needs a connection

### Requirement: Staff-managed partner data
Partner entries SHALL be created, edited, and deactivated only by staff with the admin role. Deactivated partners SHALL disappear from the app on its next data refresh.

#### Scenario: Partner deactivated
- **WHEN** an admin deactivates a partner and a user's app refreshes its data
- **THEN** that partner no longer appears in the user's list or map
