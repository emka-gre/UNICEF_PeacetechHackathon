## Why

Women are disproportionately targeted by gendered misinformation and online harm: fabricated stories, manipulated images, coordinated harassment, and false claims designed to discredit, shame, or endanger them. Platforms like Instagram and Reddit do not give us the access or tools to screen this content at scale, so today we have no reliable way to see what is circulating, who is affected, or how harm online connects to risk offline.

Laaha already has a website and an audience that trusts it. A dedicated app lets us give women practical tools to report harm and reach help, and build a crowdsourced dataset of gendered misinformation that we cannot collect any other way. That data supports advocacy, research, partner organisations, and future moderation work.

This change is **Phase 1 (foundation)** of a larger plan. It delivers the data pipeline (report → moderate → export) and the offline-capable help directory that later phases build on.

## What Changes

- **Crowdsourced incident reporting**: a form where users submit examples of gendered misinformation or harm (post link, e.g. Instagram, screenshot, description, category, platform, approximate date). Reports can be anonymous. Users choose whether the report may be used for research and/or shared with partners. Submissions go into a moderated dataset and are never published directly.
- **Offline mode and sync**: the incident form, saved resources, partner hub list and emergency contacts work without a connection. Reports made offline are stored encrypted on the device and synced automatically when the connection returns.
- **Partner hub locator**: a searchable list and map of partner organisations (legal aid, counselling, shelters, digital-safety clinics) with services, hours, languages and contact details. It is available offline.
- **Report moderation dashboard**: an internal tool where Laaha staff review, tag and verify incoming reports, and export anonymised aggregate data for research and advocacy.
- **Baseline safety features**: a quick-exit button and a discreet app appearance, needed from Phase 1 because the app is used by people whose phones may be accessed by an abuser.

### Out of scope (later changes)

- Phase 2: `support-contact` (chat, call, visit) and `fact-check-assistant`
- Phase 3: `emergency-tracker` (after a security review) and `reddit-response-bot`
- Integration with the existing Laaha website (shared accounts, navigation, entry points). The app is built standalone for now.

## Capabilities

### New Capabilities
- `incident-reporting`: crowdsourced submission of misinformation and harm cases (links, screenshots, descriptions), with anonymity, a clear research-use notice, optional partner sharing, and image metadata stripping
- `offline-sync`: encrypted on-device storage and automatic background sync for reports, plus offline caching of resources, hub data and emergency contacts
- `partner-hub-locator`: searchable directory and map of partner organisations and services that works offline
- `report-moderation-dashboard`: staff review, tagging, verification and anonymised aggregate export of collected reports, with role-restricted access
- `app-safety-controls`: quick-exit button, discreet app appearance and optional PIN lock that protect users whose device may be accessed by someone else

### Modified Capabilities
<!-- None. No specs exist yet. -->

## Safety, Privacy and Ethics

- **Reports may contain personal data about victims and third parties.** Collect as little as possible, encrypt at rest and in transit, strip metadata from uploaded images, and restrict staff access by role.
- **Research use and anonymity**: every report may be used anonymously in research, and the form says so plainly before sending. Users choose whether to stay anonymous and whether a report may be shared with partner organisations. Exports never contain contact details.
- **Device safety**: quick exit and a discreet appearance from day one, so that someone looking at the phone cannot easily tell what the app is for.
- **Platform rules**: Instagram content is collected only through user submissions (links, screenshots), never by scraping.
- **Legal compliance**: comply with applicable data protection law in every region we operate in, and publish a clear privacy notice before launch.

## Impact

- New repository contents: a PWA front end, a backend API, and a staff dashboard (the repo currently holds only a LICENSE)
- New backend services: report storage, sync API, hub directory API, moderation and export
- External dependencies: map tiles/provider, object storage for screenshots
- Operational needs: moderators for incoming reports, partner onboarding and keeping partner data up to date
- A privacy impact assessment is required before any real user data is collected. Until then the prototype runs on mock and seeded data.
