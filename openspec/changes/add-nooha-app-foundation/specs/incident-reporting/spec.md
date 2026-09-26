## Purpose

Lets users submit examples of gendered misinformation and online harm into a moderated dataset, with control over anonymity and how their report may be used.

## ADDED Requirements

### Requirement: Submit an incident report
The system SHALL let a user submit an incident report containing a category, a platform, and at least one of: a post link, a screenshot, or a free-text description. The report MAY also include an approximate date of the incident. Category SHALL be one of: fabricated story, manipulated image or video, harassment or pile-on, false claim to discredit, doxxing or exposure, other. Platform SHALL be one of: Instagram, Reddit, Facebook, TikTok, X, WhatsApp, other.

#### Scenario: Report with link and category
- **WHEN** a user enters an Instagram post link, selects category "fabricated story" and platform "Instagram", and submits
- **THEN** the system accepts the report and shows a confirmation with a report reference code

#### Scenario: Report with no evidence
- **WHEN** a user selects a category and platform but provides no link, screenshot, or description
- **THEN** the system rejects the submission and asks for at least one piece of evidence

#### Scenario: Invalid link
- **WHEN** a user enters a post link that is not a valid http or https URL
- **THEN** the system shows a validation error on the link field and does not submit

### Requirement: Online and in-person reports
The report form SHALL first ask whether the harm happened online or in person, and SHALL adapt the rest of the form to the answer. Online reports SHALL ask for a platform and accept a link, screenshots and a description. In-person reports SHALL offer in-person categories (verbal harassment or insults, rumours or lies spread about her, threats or intimidation, being followed or watched, physical or sexual violence, other), ask for a type of place instead of a platform, require a short description or a photo, accept an optional town or area, and SHALL NOT accept a link. The in-person town or area SHALL NOT appear in exports. When the chosen category suggests physical danger, the form SHALL show a call-emergency-services prompt before the details step.

#### Scenario: In-person report
- **WHEN** a user chooses "In person", category "Being followed or watched", place "Street or public transport" and writes a description
- **THEN** the report is accepted and stored with mode "in-person" and no platform

#### Scenario: Wrong category for the mode
- **WHEN** an in-person report is sent with an online-only category such as "Fabricated story"
- **THEN** the system rejects it

#### Scenario: Danger prompt
- **WHEN** a user chooses "Physical or sexual violence"
- **THEN** the details step shows a button to call the emergency number

### Requirement: Anonymous reporting
The system SHALL let anyone submit a report without an account. Reports SHALL be anonymous by default: the system SHALL NOT store a name, phone number, device identifier, or IP address with a report. The user MAY optionally give a contact email for follow-up, and the form SHALL explain that doing so makes the report non-anonymous to Laaha staff.

#### Scenario: Anonymous submission
- **WHEN** a user submits a report without entering a contact email
- **THEN** the stored report contains no contact details and no IP address

#### Scenario: Optional follow-up contact
- **WHEN** a user enters a contact email and submits
- **THEN** the email is stored with the report, visible only to staff, and never included in exports

### Requirement: Research use and partner sharing
Every submitted report SHALL be usable by Laaha, without the reporter's contact details, in anonymised research and advocacy data. This is a condition of sending, and the form SHALL state it plainly before the Send button. Sharing a report with partner organisations SHALL be a separate, optional choice that defaults to "no". The partner-sharing choice SHALL be stored with the report.

#### Scenario: Research use is stated before sending
- **WHEN** a user reaches the last step of the report form
- **THEN** a notice explains that the report will be used anonymously in research, and there is no option to opt out of it

#### Scenario: Partner sharing defaults to no
- **WHEN** a user sends a report without ticking partner sharing
- **THEN** the stored report records research use as true and partner sharing as false

### Requirement: Screenshot upload with metadata stripping
The system SHALL accept up to 5 screenshot images per report in JPEG, PNG, or WebP format, each no larger than 10 MB. Before an image is stored on the server, all embedded metadata (including EXIF, GPS location, device model, and timestamps) SHALL be removed.

#### Scenario: Location metadata removed
- **WHEN** a user uploads a JPEG that contains GPS coordinates in its EXIF data
- **THEN** the stored image contains no EXIF or GPS data

#### Scenario: Unsupported file
- **WHEN** a user attempts to attach a PDF or a file larger than 10 MB
- **THEN** the system rejects that file with an explanation and keeps the rest of the form intact

### Requirement: Reports are never published directly
Submitted reports SHALL enter the moderation queue with status "pending" and SHALL NOT be visible to other app users or to the public.

#### Scenario: New report goes to moderation
- **WHEN** a report is submitted
- **THEN** it appears in the moderation queue with status "pending" and nowhere in the public app

### Requirement: No scraping of platform content
The system SHALL obtain platform content only from what the user submits (links, screenshots, text). It SHALL NOT fetch, scrape, or store content from the linked post itself.

#### Scenario: Link stored as submitted
- **WHEN** a user submits an Instagram post link
- **THEN** the system stores only the link text and makes no request to Instagram to retrieve the post
