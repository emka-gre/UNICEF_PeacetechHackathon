## Purpose

Protects users whose phone may be seen or accessed by an abuser, by letting them leave the app instantly and keeping the app's purpose from being obvious.

## ADDED Requirements

### Requirement: Quick exit
Every screen of the public app SHALL show a quick-exit control. Activating it SHALL immediately replace the app with a neutral page (a weather page by default) and SHALL NOT leave the previous screen reachable through the browser back button.

#### Scenario: Quick exit from report form
- **WHEN** a user taps quick exit while filling in a report
- **THEN** a neutral page is shown at once and pressing back does not return to the report form

#### Scenario: Unsaved draft discarded
- **WHEN** a user taps quick exit with an unsent report draft
- **THEN** the draft is discarded rather than kept on screen

### Requirement: Discreet appearance
The user SHALL be able to turn on discreet mode, which shows a neutral name and icon (for example "Notes") in place of Laaha branding. When discreet mode is on, page titles, the in-app header, and any notifications SHALL NOT mention Laaha, harm, or reporting. If discreet mode is on when the user installs the app to her home screen, the installed name and icon SHALL be the neutral ones. The app SHALL tell the user that switching discreet mode after installing needs a reinstall to change the home-screen icon.

#### Scenario: Enable discreet mode
- **WHEN** a user turns on discreet mode
- **THEN** the page title, header, and any notifications use the neutral name only

#### Scenario: Install in discreet mode
- **WHEN** a user turns on discreet mode and then adds the app to her home screen
- **THEN** the home-screen icon and label are the neutral ones

### Requirement: Optional PIN lock
The user SHALL be able to set a 4 to 6 digit PIN. When a PIN is set, the app SHALL require it when opened and after 5 minutes in the background. After 5 wrong attempts the app SHALL wait 1 minute before allowing another attempt.

#### Scenario: PIN required on open
- **WHEN** a user with a PIN set opens the app
- **THEN** the PIN screen appears before any content

#### Scenario: Too many wrong attempts
- **WHEN** a wrong PIN is entered 5 times
- **THEN** the app blocks further attempts for 1 minute
