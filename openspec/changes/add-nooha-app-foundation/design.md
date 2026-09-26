## Context

The repository is empty apart from a LICENSE, so this is a greenfield build. It is being built as a hackathon prototype: it must run end to end with seeded mock data and no real user data until a privacy impact assessment is done (see proposal.md, Impact). The app is standalone; integration with the existing Laaha website is deferred.

The users most in need may have low-end Android phones, patchy connectivity, and a device that someone else can inspect. That drives three constraints: offline-first, small bundle, and nothing sensitive left readable on the device.

### Hackathon build

For the hackathon we build a simplified MVP (see tasks.md). It is a single package: a Vite + React PWA and a small Express server that stores data in a JSON file, instead of the monorepo, Postgres, MinIO and Drizzle described below. Encryption at rest, PIN lock, staff accounts with roles, and the audit log are deferred. The decisions below describe the target architecture for after the hackathon (tasks-full.md).

## Goals / Non-Goals

**Goals:**
- One TypeScript codebase that a small team can run locally with a single command
- The public app works offline after the first visit and installs to the home screen
- The data path (report → moderation → anonymised export) enforces consent and minimisation server-side, not only in the UI
- Seams in place so Phase 2/3 features (support contact, fact-check, emergency tracker, Reddit bot) can be added as new modules without restructuring

**Non-Goals:**
- Native iOS/Android apps
- Public user accounts or Laaha website account linking
- Actually sharing reports with partners (the consent is recorded now; the sharing mechanism comes later)
- Production hosting, backups, and scaling beyond a demo

## Decisions

### 1. PWA instead of native apps
A React + Vite PWA (TypeScript), with a Workbox service worker.
- *Why*: one codebase, installable, works offline, no app-store review, and it is easier to keep discreet (no store listing that names the app).
- *Alternatives*: React Native/Expo gives better native integration (dynamic icons, secure storage) but doubles the build targets and slows the hackathon. We can revisit it for Phase 3, where the emergency tracker needs background location that PWAs handle poorly.

### 2. Monorepo layout
npm workspaces:
- `apps/web`: public PWA
- `apps/staff`: moderation dashboard (separate React app, separate origin in production)
- `apps/api`: backend
- `packages/shared`: types, zod schemas, enums (categories, platforms, service types), shared by all three
- *Why*: the report schema is validated identically on the client, offline queue and server. Serving the staff dashboard separately keeps staff code and routes out of the public bundle.

### 3. Backend: Node + Fastify + Postgres
Fastify API with PostgreSQL through Drizzle ORM. Screenshots go in S3-compatible object storage (MinIO in local dev). Docker Compose runs Postgres and MinIO.
- *Alternatives*: Firebase/Supabase would be faster to start, but they make it harder to guarantee "no IP stored" and server-side metadata stripping, and they tie sensitive data to a third party before the privacy review.

### 4. Anonymity enforced at the edge
The report endpoint does not log request IPs or user agents. Fastify request logging is turned off for that route, and the reverse proxy config in the repo drops them as well. Reports have no user foreign key. The optional contact email is kept in a separate `report_contacts` table that only staff queries join, so exports cannot pick it up by accident.

### 5. Image metadata stripped twice
On the client, images are re-encoded through a canvas before they are queued, which drops EXIF and also shrinks them for slow uploads. On the server, `sharp` re-encodes every upload without metadata before it is stored. The server pass is the one that counts; the client pass protects the offline queue and saves bandwidth.

### 6. Offline storage and encryption
IndexedDB (via Dexie) holds the report queue, emergency contacts, cached partners, and guides. Sensitive stores (queue, contacts) are encrypted with AES-GCM using a WebCrypto key generated as **non-extractable** and kept in IndexedDB. When the user sets a PIN, the data key is wrapped with a key derived from the PIN (PBKDF2, 310k iterations), so the data cannot be read without the PIN.
- *Trade-off*: without a PIN, the key lives on the same device as the data. That protects against casual inspection of storage and exported files, not against someone with full control of an unlocked browser. The PIN option closes most of that gap, and the app says so when offering it.

### 7. Idempotent sync
The client gives each report a UUID when it is created. `POST /reports` is an upsert on that UUID, so a retry after a dropped connection is harmless. The queue deletes a report only after a 2xx response. Sync runs on the `online` event, on app start, and through Background Sync where the browser supports it (Chromium). Screenshots upload first to pre-signed URLs; the report body references them.

### 8. Reference data as one versioned bundle
Partners and published guides are served as a single JSON bundle with an ETag. The app fetches it at most every 24 hours or on manual refresh, and replaces the local copy atomically. Search and filtering run on the client against this bundle (the dataset is small, hundreds of entries), so they work offline.

### 9. Maps: Leaflet + OpenStreetMap
Leaflet with OSM tiles. Map tiles are not cached for offline use (too heavy); the list view is the offline fallback. "Near me" uses the Geolocation API only after a tap, and distance is computed on the device.
- *Alternatives*: Google Maps and Mapbox need API keys and send usage data to a third party.

### 10. Staff auth and audit
Email + password (argon2id) with secure HTTP-only session cookies. There are two roles: moderator and admin. Every mutating staff action and every screenshot view writes an append-only `audit_log` row. Screenshots are only served through a staff-authenticated endpoint that writes the audit row and then redirects to a short-lived signed URL.

### 11. Export built from a server-side view
The CSV export is built from a Postgres view that selects only the allowed columns (category, platform, incident month/year, tags, status) and filters on `research_consent = true AND status = 'verified'`. The endpoint cannot return any other columns, whatever the UI asks for.

### 12. Quick exit and discreet mode
Quick exit calls `location.replace()` to a neutral page and first clears in-memory form state, so the back button cannot return to the app. It also has a keyboard shortcut (Esc pressed twice) for desktop use. Discreet mode switches the title, header, and theme, and the app serves a manifest with the neutral name and icon while discreet mode is on. A PWA cannot change its icon after install, which is why the spec asks the user to reinstall.

## Risks / Trade-offs

- [Browser storage can be wiped by the OS or the user, losing queued reports] → Show queued items clearly, request persistent storage (`navigator.storage.persist()`), and encourage sending as soon as the user is online.
- [iOS Safari has no Background Sync and limited PWA storage] → Sync on app open and on the `online` event; document the limitations on iOS.
- [Someone who controls the unlocked device can still use the app] → Offer a PIN, quick exit, and "delete data on this device"; the in-app safety tips say what these can and cannot protect against.
- [Moderators are exposed to disturbing content] → Blur screenshots by default in the dashboard, with click to reveal. Add wellbeing guidance to the moderator onboarding notes.
- [Free-text descriptions may contain third-party personal data] → Never exported. Show a note in the form asking users not to include other people's contact details.
- [Seeded mock data could be mistaken for real data in demos] → Label all seed partners and reports as "Demo", and show a prototype banner when the demo seed is loaded.

## Migration Plan

Greenfield, so there is nothing to migrate. Database schema changes go through Drizzle migrations from day one, so the prototype schema can grow into production. Rollback during the prototype is `docker compose down -v` and a re-seed.

## Open Questions

- Which regions run the pilot? This decides which data protection regime the privacy notice and retention periods follow (for example GDPR, or national law in MENA countries).
- How long are verified and rejected reports and screenshots kept? The design supports a scheduled purge job; the periods need a policy decision.
- Which languages does the first release ship in? The app is built with i18n from the start, with English strings first.
- Who supplies and maintains the initial partner list?
