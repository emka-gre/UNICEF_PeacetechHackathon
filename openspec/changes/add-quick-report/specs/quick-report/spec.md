## Purpose

Lets someone report harmful online content in one or two taps, from the phone's share menu or a home screen button, while keeping the same anonymity, consent and offline guarantees as the full report form.

## ADDED Requirements

### Requirement: Share to Laaha from other apps
When the app is installed on a device that supports web share targets, it SHALL appear in the system share menu. Choosing it SHALL open the quick report screen with the shared link and text filled in. If the shared text contains a link, the link SHALL be extracted into the link field.

#### Scenario: Share an Instagram post
- **WHEN** a user taps Share on an Instagram post and chooses Laaha
- **THEN** the quick report screen opens with the post's link filled in

#### Scenario: Link inside shared text
- **WHEN** the shared content is text containing "https://www.tiktok.com/@user/video/123"
- **THEN** the link field shows that URL and the remaining text is kept as the description

### Requirement: Quick report from inside the app
The home screen SHALL offer a quick report button that opens the same quick report screen empty, where the user can paste a link, type a few words, or add a screenshot.

#### Scenario: iPhone user without share target
- **WHEN** a user taps the quick report button and pastes a link
- **THEN** the quick report screen shows the link and the Send now button is enabled

### Requirement: Quick report screen
The quick report screen SHALL show the evidence (link, text and any screenshots), an option to add screenshots, the research-use notice, a Send now button and an Add details button. Send now SHALL require at least a link, a screenshot or some text. A link SHALL start with https://. Screenshots SHALL have their metadata stripped on the device, as in the full form.

#### Scenario: Nothing to send
- **WHEN** the user taps Send now with no link, no text and no screenshot
- **THEN** the report is not sent and a message asks for at least one of them

#### Scenario: Research-use notice shown before sending
- **WHEN** the quick report screen is displayed
- **THEN** the research-use notice is visible above the Send now button

### Requirement: Continue in the full form
Add details SHALL open the full report form with the mode set to online and the link, text and screenshots from the quick report screen already filled in.

#### Scenario: Add details
- **WHEN** a user with a shared link taps Add details
- **THEN** the full form opens at the "Who was targeted?" step with the link and text already in the details step

### Requirement: Quick reports are anonymous and queued
A quick report SHALL be sent through the same offline queue as other reports and SHALL NOT include contact details, device identifiers or the user's account on the source platform. Partner sharing SHALL be off. Research consent SHALL be recorded as given, because the notice is shown before sending.

#### Scenario: Sent while offline
- **WHEN** a user taps Send now with no connection
- **THEN** the report is kept on the device and sent automatically when the connection returns, and the user is told this

### Requirement: Automatic filling on the server
The server SHALL accept a quick report without a target or category. It SHALL set the mode to online, the target to "I'd rather not say", and the platform from the link's domain (or "Other" when the domain is not recognised or there is no link). It SHALL suggest one of the online categories from the evidence. When no suggestion is available, the category SHALL be "Other". The report SHALL be saved before the suggestion is made, so a failed suggestion never loses a report. The report SHALL be marked as auto-filled.

#### Scenario: Platform from link
- **WHEN** a quick report arrives with the link "https://www.instagram.com/p/abc123/"
- **THEN** the stored report has platform "Instagram", mode online, target "I'd rather not say", and the auto-filled mark

#### Scenario: Suggestion unavailable
- **WHEN** a quick report arrives and the category suggestion fails or no AI service is configured
- **THEN** the report is stored with category "Other" and status pending

### Requirement: Aftercare after a quick send
The screen shown after a quick send SHALL confirm the report was received (or queued), show the reference code, and offer the emergency number, helplines and the option to add more details in a new full report.

#### Scenario: After sending
- **WHEN** a quick report is sent
- **THEN** the confirmation screen shows the reference code and a link to call a helpline
