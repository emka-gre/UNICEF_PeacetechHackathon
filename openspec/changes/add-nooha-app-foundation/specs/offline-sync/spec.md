## Purpose

Keeps the core help features usable without a connection and makes sure reports written offline are stored securely on the device and delivered once the connection returns.

## ADDED Requirements

### Requirement: Core features available offline
After the app has been opened once while online, the incident report form, saved resources, partner hub list, and the user's emergency contacts SHALL be usable with no network connection.

#### Scenario: Open hub list offline
- **WHEN** a user who has opened the app before goes into airplane mode and opens the partner hub list
- **THEN** the list loads from the device with the most recently downloaded data

#### Scenario: Offline indicator
- **WHEN** the device has no connection
- **THEN** the app shows a visible offline indicator

### Requirement: Encrypted offline report queue
A report submitted while offline SHALL be stored on the device in encrypted form, including any attached screenshots, and SHALL be marked "waiting to send" in the user's view. Offline reports SHALL NOT be stored in plain text.

#### Scenario: Submit while offline
- **WHEN** a user submits a report with no connection
- **THEN** the app confirms the report is saved on the device and will be sent when back online

#### Scenario: Stored data is not readable in plain text
- **WHEN** the device's local app storage is inspected
- **THEN** the queued report content and screenshots are not readable without the encryption key

### Requirement: Automatic sync on reconnect
When a connection becomes available, the app SHALL send queued reports to the server without user action, oldest first. A report SHALL be removed from the device only after the server confirms it was received. Retrying the same report SHALL NOT create a duplicate on the server.

#### Scenario: Reconnect sends queue
- **WHEN** the device reconnects with two reports in the queue
- **THEN** both reports are sent, the server stores each exactly once, and both are removed from the device

#### Scenario: Interrupted upload
- **WHEN** the connection drops partway through sending a report
- **THEN** the report stays in the queue and is retried on the next reconnect without creating a duplicate

### Requirement: Cached reference data refresh
When online, the app SHALL refresh cached partner hub and resource data at least once every 24 hours and SHALL show the date of the last successful update.

#### Scenario: Stale data refreshed
- **WHEN** the app is opened online and the cached hub data is more than 24 hours old
- **THEN** the app downloads updated data and shows the new "last updated" date

### Requirement: Emergency contacts on device
The user SHALL be able to save up to 5 emergency contacts (name and phone number) and call one with a single tap. Emergency contacts SHALL be stored only on the device, encrypted, and SHALL NOT be sent to the server.

#### Scenario: Call saved contact offline
- **WHEN** a user with no data connection taps a saved emergency contact
- **THEN** the phone's dialer opens with that number

#### Scenario: Contacts stay local
- **WHEN** a user saves an emergency contact
- **THEN** no request containing the contact is sent to the server

### Requirement: Saved resources
The app SHALL provide a library of short safety and support guides published by Laaha staff. The user SHALL be able to save guides, and saved guides SHALL open offline.

#### Scenario: Open saved guide offline
- **WHEN** a user saves a guide and later opens it with no connection
- **THEN** the full guide is displayed

### Requirement: Clear local data
The user SHALL be able to delete all app data stored on the device, including queued reports, with a single confirmed action.

#### Scenario: Wipe device data
- **WHEN** a user chooses "Delete data on this device" and confirms
- **THEN** all cached data, queued reports, and saved contacts are removed from the device
