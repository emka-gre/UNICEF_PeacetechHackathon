## 1. Shared types and server

- [ ] 1.1 Add `origin: 'quick'` to `ReportInput` and allow `victim` and `category` to be missing for that origin only; verify the API still rejects a form report without them
- [ ] 1.2 In `POST /api/reports`, fill in quick reports (mode online, target "not-say", category "Other", platform from the link's domain, tracking parameters removed from the link) and tag them `auto-filled`; verify posting an Instagram link stores platform "Instagram" and posting twice stores one report
- [ ] 1.3 After saving a quick report, ask Claude for one online category and store it as `suggestedCategory` and `category`; keep "Other" on failure or without an API key; verify with and without a key

## 2. Quick report screen

- [ ] 2.1 Add the `/quick` route: link, text, screenshots (metadata stripped), research-use notice, Send now and Add details; verify the "nothing to send" and "invalid link" errors show
- [ ] 2.2 Send through the existing queue with `origin: 'quick'` and show a confirmation with the reference code, emergency number and helpline links; verify a report sent in DevTools offline mode arrives after reconnecting
- [ ] 2.3 Make Add details open `/report` pre-filled (mode online, link, text, screenshots) at the "Who was targeted?" step; verify the details step shows the shared evidence
- [ ] 2.4 Add a quick report button to the home screen; verify it opens `/quick` empty

## 3. Share target

- [ ] 3.1 Add a GET `share_target` to the PWA manifest pointing at `/quick`, read `url`, `text` and `title`, extract the first https link, then clear the query string; verify by installing the built app on an Android phone and sharing an Instagram post to it
- [ ] 3.2 Note on the discreet-mode setting that the share menu always shows the app's installed name; verify the text appears

## 4. Staff dashboard

- [ ] 4.1 Show an "Auto-filled" badge and the suggested category, and add a filter for auto-filled reports; verify a quick report shows both
- [ ] 4.2 Add "Confirm category", which sets the category and removes the `auto-filled` tag; make the server refuse to verify a report that still has the tag; verify the refusal and that a confirmed, verified report appears in the export without the tag
- [ ] 4.3 Leave auto-filled reports out of the category counts; verify the counts change after confirming one

## 5. Docs

- [ ] 5.1 Update the README feature table and the privacy notes (quick report evidence is sent to Claude for a category suggestion); verify the README describes how to try the share target
