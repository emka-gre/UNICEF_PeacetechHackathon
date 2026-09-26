## 1. Project setup

- [ ] 1.1 Create npm workspaces monorepo with `apps/web`, `apps/staff`, `apps/api`, `packages/shared`, TypeScript, ESLint and Vitest; verify `npm install` and `npm test` succeed from the root
- [ ] 1.2 Add Docker Compose with Postgres and MinIO plus an `.env.example`; verify `docker compose up` starts both and the API health check returns 200
- [ ] 1.3 Add a root `npm run dev` that starts api, web and staff together; verify all three are reachable in the browser
- [ ] 1.4 Define shared enums (report categories, platforms, statuses, partner service types) and zod schemas for report, partner and guide in `packages/shared`; verify unit tests accept valid examples and reject invalid ones (bad URL, no evidence, unknown category)
- [ ] 1.5 Set up i18n in `apps/web` with English strings; verify no hard-coded UI strings remain in the shell components

## 2. Database and API foundation

- [ ] 2.1 Create Drizzle schema and first migration: `reports`, `report_contacts`, `report_images`, `report_tags`, `report_notes`, `partners`, `guides`, `staff_users`, `audit_log`; verify the migration applies to an empty database
- [ ] 2.2 Create the `export_reports_v` view that returns only category, platform, incident month/year, tags and status, for verified reports with research consent; verify with a SQL test that non-consenting and unverified rows are excluded
- [ ] 2.3 Add a seed script with demo partners, guides and reports, all labelled "Demo", plus one admin and one moderator account; verify `npm run seed` populates the database and can be re-run safely

## 3. Incident reporting (API)

- [ ] 3.1 Add an endpoint that returns pre-signed upload URLs, limited to 5 images per report, JPEG/PNG/WebP, 10 MB max; verify tests reject a PDF and an 11 MB file
- [ ] 3.2 Add server-side image processing that re-encodes each upload with `sharp` and removes all metadata before final storage; verify with a test that a JPEG fixture with GPS EXIF has no EXIF after processing
- [ ] 3.3 Implement `POST /reports` as an idempotent upsert on the client UUID, validated with the shared schema, with status `pending`; verify that posting the same UUID twice stores one row
- [ ] 3.4 Turn off IP and user-agent logging for the report routes and store the optional contact email only in `report_contacts`; verify with a test that the log output and the `reports` row contain no IP, and that the email lands only in `report_contacts`
- [ ] 3.5 Confirm there is no outbound fetch to linked platforms; verify with a test that stubs the network and asserts that no request goes to the submitted link host

## 4. Incident reporting (app)

- [ ] 4.1 Build the report form (category, platform, link, description, approximate date, up to 5 screenshots) with inline validation from the shared schema; verify with component tests covering "no evidence", "invalid link" and "unsupported file"
- [ ] 4.2 Add the two consent checkboxes (research, partner sharing), both off by default, and the optional contact email with its non-anonymity explanation; verify with component tests of the defaults and the stored payload
- [ ] 4.3 Re-encode images on the client through a canvas before queueing; verify with a unit test that the output blob has no EXIF
- [ ] 4.4 Show a confirmation screen with a report reference code after submission; verify manually by submitting a demo report and seeing the code

## 5. Offline storage and sync

- [ ] 5.1 Configure the Workbox service worker to precache the app shell and cache the reference bundle; verify in DevTools offline mode that the app loads after one online visit
- [ ] 5.2 Implement the encrypted IndexedDB store (Dexie + AES-GCM, non-extractable key) for the report queue and emergency contacts; verify with a test that the raw stored values are not plain text
- [ ] 5.3 Queue reports and images when offline and show "waiting to send"; verify manually by submitting in offline mode and seeing the queued item
- [ ] 5.4 Implement the sync worker (oldest first, delete only after a 2xx, triggered by the `online` event, app start and Background Sync where supported); verify with a test that simulates a dropped connection, with no duplicate on the server and the queue emptying on retry
- [ ] 5.5 Add a visible offline indicator and a "last updated" date for reference data; verify by toggling offline in DevTools
- [ ] 5.6 Call `navigator.storage.persist()` on first use; verify the result is logged and handled when it is denied

## 6. Partner hub locator

- [ ] 6.1 Add a `GET /bundle` endpoint that returns active partners and published guides with an ETag; verify a second request with `If-None-Match` returns 304
- [ ] 6.2 Refresh the bundle in the app at most every 24 hours and replace the local copy atomically; verify with a unit test using a mocked clock
- [ ] 6.3 Build the partner list with client-side search and filters by service and language; verify with a component test for "legal aid + Arabic" and the "no results" message
- [ ] 6.4 Build the partner detail view (services, hours, languages, contacts with tap-to-call and tap-to-email); verify manually against seeded partners
- [ ] 6.5 Build the Leaflet/OSM map view with a "Near me" button that asks for geolocation only on tap and sorts by distance on the device; verify that no permission prompt appears before the tap and that no location is sent to the network
- [ ] 6.6 Show the list with an explanation when the map is opened offline; verify in offline mode

## 7. Resources and emergency contacts

- [ ] 7.1 Build the guide library with save and unsave; verify a saved guide opens in offline mode
- [ ] 7.2 Build the emergency contacts screen (up to 5, stored encrypted locally, one-tap `tel:` call); verify no network request contains contact data
- [ ] 7.3 Add "Delete data on this device" with a confirmation step; verify IndexedDB, caches and the queue are empty afterwards

## 8. App safety controls

- [ ] 8.1 Add a quick-exit button on every screen, plus Esc pressed twice, that clears form state and calls `location.replace()` to a neutral page; verify with an end-to-end test that back does not return to the form
- [ ] 8.2 Build discreet mode (neutral title, header, theme and notifications) and a manifest endpoint that serves the neutral name and icon while it is on; verify the page title changes and the manifest returns the neutral name
- [ ] 8.3 Add the reinstall notice shown when discreet mode is toggled after install; verify it appears in standalone display mode
- [ ] 8.4 Build the optional PIN lock (4 to 6 digits, PBKDF2-wrapped data key, locks after 5 minutes in background, 1-minute lockout after 5 wrong attempts); verify with unit tests for the lockout and that data cannot be decrypted without the PIN

## 9. Moderation dashboard

- [ ] 9.1 Add staff auth (argon2id, HTTP-only session cookie) and moderator/admin role guards on API routes; verify with tests that unauthenticated requests get 401 and a moderator calling export gets 403
- [ ] 9.2 Write an audit log entry for every mutating staff action; verify with a test that a status change creates an audit row with the staff id and time
- [ ] 9.3 Build the queue view with status, category, platform and date filters; verify filtering "pending + Instagram" against seeded data
- [ ] 9.4 Build the report detail view: change status, correct category, add tags and notes, with screenshots blurred by default and served through an audited, signed-URL endpoint; verify that opening a screenshot creates an audit row
- [ ] 9.5 Build admin pages to create, edit and deactivate partners and to create, publish and unpublish guides; verify the change shows up in the app after a bundle refresh
- [ ] 9.6 Build the CSV export from `export_reports_v` (admin only); verify with a test that the CSV headers are exactly the allowed columns and non-consenting reports are absent
- [ ] 9.7 Build the aggregate overview (counts by category, platform and month for a date range); verify the counts match the seeded data

## 10. Integration and release readiness

- [ ] 10.1 Write a Playwright end-to-end test for the whole flow: submit offline, reconnect, the report appears as pending in the dashboard, the moderator verifies it, and the admin export includes it; verify it passes in CI
- [ ] 10.2 Add a prototype banner and "Demo" labels whenever seed data is loaded; verify they are visible in both apps
- [ ] 10.3 Run a Lighthouse PWA and accessibility audit on the public app; verify it is installable and scores 90 or more for accessibility
- [ ] 10.4 Write a README covering setup, the demo accounts, the known iOS limitations and the device-safety limits of offline encryption; verify a teammate can run the demo from a fresh clone
