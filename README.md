# Laaha app (hackathon prototype)

A web app (PWA) where women can report gendered misinformation and online harm, find partner organisations, and call helplines or people they trust. It works offline. Laaha staff review reports in a simple moderation dashboard.

**Prototype: demo data only.** Don't collect real reports with this build.

## Run it

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- Staff dashboard: http://localhost:5173/staff (password `laaha-demo`, change with `STAFF_PASSWORD`)

The "Is it true?" assistant uses Claude. Without a key it gives labelled demo answers. To connect it:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Reports are saved to `server/data/db.json`. Delete that file to start fresh.

To try it as an installable offline app, build it and serve it from one port:

```bash
npm run build
npm start   # http://localhost:3001
```

## What's in it

| Feature | Where |
|---|---|
| Report harm: link, screenshots (metadata stripped on the phone), description, consent choices, optional email | `src/pages/Report.tsx` |
| Offline queue, sent automatically when back online, no duplicates | `src/lib/queue.ts` |
| Find help: search, filters, map, "Near me" (location stays on the phone) | `src/pages/Hubs.tsx` |
| Guides and emergency contacts, both usable offline | `src/pages/Guides.tsx`, `src/pages/Contacts.tsx` |
| Quick exit (✕ button or Esc twice), discreet mode, delete data on this phone | `src/lib/safety.ts`, `src/pages/Settings.tsx` |
| Moderation: filter, verify, tag, stats, anonymised CSV export | `src/pages/Staff.tsx`, `server/index.ts` |

Demo partners and guides are in `server/seed.ts`.

## Not in the prototype

Encryption of data on the phone, PIN lock, real staff accounts, an audit log, and a real database. See `openspec/changes/add-nooha-app-foundation/tasks-full.md` for the full plan.
