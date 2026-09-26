# Laaha extension (hackathon prototype)

Our answer to the UNICEF challenge at the PeaceTech Hackathon 2026: *How might we protect women and girls in crisis from gendered disinformation?*

Laaha already exists as UNICEF's online space for women and girls. This project extends it in three parts:

1. **The Laaha app**: a new mobile web app (PWA) where women can report gendered disinformation and online harm, check what's true, find partner organisations, and call helplines or people they trust. It works offline and can disguise itself on the phone.
2. **New features on the Laaha website**: [to be added].
3. **Using the collected data**: a moderation dashboard, anonymised export, and an insights page that turns reports into trends and early warnings.

**Prototype: demo data only.** Don't collect real reports with this build.

> **Hackathon judges:** start with **[docs/SUBMISSION.md](docs/SUBMISSION.md)**, or read the same summary as a **[web page](https://claude.ai/artifact/JWB8J6KspVsKcXHQNhpqFf)**. It explains the idea and every feature, and shows how to open the app, the staff dashboard, the insights page and the [clickable mockup of reporting from Instagram](https://claude.ai/artifact/LTgkamJAqkmL6T4jwCgjjC).

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

## Team

- Ema Greganova
- [name2]
- [name3]
- [name4]
- [name5]
- [name6]
- [name7]
- [name8]
