<!-- Hackathon MVP scope. The full production task list is in tasks-full.md. -->

## 1. Setup

- [x] 1.1 Create a single package with a Vite + React + TypeScript front end (`src/`) and a small Express server (`server/`) storing data in a JSON file; verify `npm run dev` starts both
- [x] 1.2 Seed demo partners and guides (labelled "Demo"); verify they load from `GET /api/bundle`

## 2. Incident reporting

- [x] 2.1 Build the report form (category, platform, link, description, date, up to 5 screenshots, consent checkboxes off by default, optional contact email); verify the "no evidence" and "invalid link" errors show
- [x] 2.2 Re-encode screenshots through a canvas to strip metadata before sending; verify the uploaded image has no EXIF
- [x] 2.3 Add `POST /api/reports`, an idempotent upsert on the client UUID with status `pending` and no IP stored; verify posting twice stores one report

## 3. Offline

- [x] 3.1 Queue reports in local storage when offline and sync them on the `online` event and on app start; verify in DevTools offline mode
- [x] 3.2 Add a service worker (vite-plugin-pwa) so the app shell and bundle work offline, plus an offline indicator; verify the app reloads offline

## 4. Help features

- [x] 4.1 Build the partner list with search and service/language filters, and a Leaflet map with an opt-in "Near me"; verify filtering against demo data
- [x] 4.2 Build the guides library with save for offline use, and emergency contacts stored on the device with tap-to-call; verify the contacts are never sent to the server

## 5. Safety

- [x] 5.1 Add a quick-exit button on every screen that calls `location.replace()` to a neutral page; verify back does not return to the app
- [x] 5.2 Add a discreet-mode toggle (neutral title and header) and "Delete data on this device"; verify the title changes and local storage is cleared

## 6. Staff dashboard

- [x] 6.1 Build a `/staff` page behind a shared demo password: list with filters, change status, add tags; verify a submitted report can be verified
- [x] 6.2 Add a CSV export with only category, platform, month/year, tags and status, for verified reports with research consent; verify non-consenting reports are excluded
- [x] 6.3 Add simple counts by category and platform; verify they match the demo data

## 7. Simpler report form (added during hackathon)

- [x] 7.1 Turn the report form into 5 short steps (who → what → where → details → send) with big tap targets and a progress bar; verify a report can be sent in under a minute
- [x] 7.2 Ask "Who was targeted?" (me, someone I know, a public woman, women in general, rather not say) and store it with the report, in the stats and in the export; verify the API rejects a report without it
- [x] 7.3 Show supportive next steps after sending when the target is "me" or "someone I know"; verify manually
- [x] 7.4 Let the user choose on the last step whether to keep a copy of the report in "My reports" on the phone (default: no), and delete saved entries from Home; verify nothing is added to history when "No" is chosen
- [x] 7.5 Replace the research-consent checkbox with a plain notice that every report is used anonymously in research; keep partner sharing as an optional choice; verify sent reports record research use as true
- [x] 7.6 Start the report form with "Online or in person?" and adapt categories, place/platform, details and after-send tips to the answer; show an emergency call prompt for danger categories; verify in-person reports without a place or with a link are rejected and the area is left out of exports

## 8. Fact-check assistant (pulled forward from Phase 2)

- [x] 8.1 Add `POST /api/factcheck` using Claude (`claude-opus-5`) with web search, returning a verdict, confidence, explanation and sources; conversations are not stored; verify with an API key set
- [x] 8.2 Fall back to clearly labelled demo answers when no API key is configured; verify the endpoint answers without a key
- [x] 8.3 Build the "Is it true?" chat screen (text, link or screenshot) with "Report this post" and "Ask a human to check" escalation; verify an escalated claim shows up in the staff dashboard tagged "from fact-check"
