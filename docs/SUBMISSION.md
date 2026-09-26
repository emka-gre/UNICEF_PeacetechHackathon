# Laaha: extending a safe space to fight gendered disinformation

**UNICEF challenge · PeaceTech Hackathon 2026 (EPFL EssentialTech Centre)**

> **How might we protect women and girls in crisis from gendered disinformation?**

**Laaha already exists.** It is UNICEF's online space where women and girls can find trusted information and support. It has a website and an audience that trusts it. We did not start from zero: our solution **extends Laaha** in three parts.

| Part | What it adds to Laaha | Status |
|---|---|---|
| **[1. The Laaha app](#3-part-1-the-laaha-app)** | A new mobile extension: report harm, check what's true, find help, call, SOS, and a discreet mode for women whose phones may be checked | Working prototype |
| **[2. New features on the Laaha website](#4-part-2-new-features-on-the-laaha-website)** | [To be added] | [To be added] |
| **[3. Using the collected data](#5-part-3-using-the-collected-data)** | Moderation, anonymised export and an insights page that turns reports into trends and early warnings | Working prototype (synthetic data) |

Every report made through Laaha becomes an anonymous, moderated record about content on platforms that no one can screen today.

> **Prototype.** All partners, helplines and insights data are demo data. Do not collect real reports with this build.

**Prefer a web page?** Read this summary at **[claude.ai/artifact/JWB8J6KspVsKcXHQNhpqFf](https://claude.ai/artifact/JWB8J6KspVsKcXHQNhpqFf)**.

**Jump to:** [Open the demo](#open-the-demo) · [The problem](#1-the-problem) · [Our idea](#2-our-idea) · [Part 1: App](#3-part-1-the-laaha-app) · [Part 2: Website](#4-part-2-new-features-on-the-laaha-website) · [Part 3: Data](#5-part-3-using-the-collected-data) · [Safety and ethics](#6-safety-privacy-and-ethics) · [Demo script](#8-demo-script) · [What's next](#9-whats-next) · [Team](#10-team)

---

## Open the demo

You can open four things in a browser. The website features in Part 2 are not in this list yet.

| What | Who it's for | Link | Login |
|---|---|---|---|
| **Laaha app** | Women and girls using the app | http://localhost:5173 (after [starting it](#1-the-app-and-the-staff-dashboard)) | None |
| **Staff dashboard** | Laaha moderators | http://localhost:5173/staff (after starting it) | Password `laaha-demo` |
| **Insights page** | UNICEF and Laaha analysts | http://localhost:8080 (after [starting it](#2-the-insights-page)) | None |
| **Report from Instagram (mockup)** | Everyone: the next feature | **[Open the clickable mockup](https://claude.ai/artifact/LTgkamJAqkmL6T4jwCgjjC)**, online, nothing to install | None |

The **Instagram mockup** is the quickest place to start. It runs in the browser with no setup, and shows the whole journey in one screen: a harmful post, **Share → Laaha**, a one-screen quick report, what the server does, and the moderator confirming the category. It is a simulation: nothing is sent. See [3.2](#32-sharing-directly-from-instagram-designed-not-built-yet) for the design.

### Before you start

You need [Node.js](https://nodejs.org) 20 or newer. The insights page also uses Python 3, which is already installed on macOS and most Linux systems.

```bash
git clone https://github.com/emka-gre/UNICEF_PeacetechHackathon.git
cd UNICEF_PeacetechHackathon
npm install
```

### 1. The app and the staff dashboard

```bash
npm run dev
```

This starts both the app and its server. Leave the terminal open, then open:

- **App:** http://localhost:5173
- **Staff dashboard:** http://localhost:5173/staff and enter the password `laaha-demo`

The app is designed for phones. On a laptop, open your browser's developer tools and switch to a phone view (in Chrome: <kbd>Cmd</kbd>+<kbd>Opt</kbd>+<kbd>I</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> on Windows, then the phone icon).

Useful pages inside the app:

| Page | Link |
|---|---|
| Report harm | http://localhost:5173/report |
| "Is it true?" chatbot | http://localhost:5173/check |
| Find help | http://localhost:5173/hubs |
| Call | http://localhost:5173/contacts |
| SOS | http://localhost:5173/sos |
| Settings (discreet mode, language) | http://localhost:5173/settings |

**The chatbot** gives labelled demo answers until you connect Claude. To connect it, stop the app (<kbd>Ctrl</kbd>+<kbd>C</kbd>) and start it again with your key:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

**Staff password:** to use a different one, start with `STAFF_PASSWORD=your-password npm run dev`.

**Start with no reports:** reports are saved in `server/data/db.json`. Delete that file to start fresh.

### 2. The insights page

Open a **second** terminal in the project folder and run:

```bash
python3 -m http.server 8080 -d insights-mockup
```

Then open **http://localhost:8080**. The synthetic dataset is already included. To make a new one, run `npm run mock:generate` and reload the page.

You can also open `insights-mockup/index.html` straight from your file browser. It works without a server.

### Try it as an installed, offline app (optional)

```bash
npm run build
npm start
```

Everything is then served from one address: the app at http://localhost:3001 and the staff dashboard at http://localhost:3001/staff. In Chrome, use **Install app** in the address bar, then turn off your internet to see offline mode.

### If something doesn't work

| Problem | Fix |
|---|---|
| The app opens on 5174 instead of 5173 | Port 5173 was busy, so it picked the next one. Use the address printed in the terminal |
| `EADDRINUSE` … `3001` in the terminal | Another copy of the app is still running. Close its terminal (or press <kbd>Ctrl</kbd>+<kbd>C</kbd> there) and start again |
| `Address already in use` for 8080 | Use another number, e.g. `python3 -m http.server 8090 -d insights-mockup`, and open http://localhost:8090 |
| The app shows an old version | Reload with <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (Mac) or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (Windows). The offline cache can keep old files |
| The app opens as a recipe app | Discreet mode is on. Type your code in the search box, or hold the "Recipes" title for 2 seconds if you didn't set one |
| Staff dashboard says "Wrong password" | The password is `laaha-demo`, unless `STAFF_PASSWORD` was set |

---

## 1. The problem

Women are targeted with made-up stories, edited photos and deepfakes, coordinated harassment, and false claims meant to discredit, shame or endanger them. Much of this happens on Instagram, TikTok, Telegram, Reddit and in closed groups.

Organisations like Laaha and UNICEF cannot see this content at scale:

- Platforms give no research access or screening tools for this kind of harm.
- Scraping breaks platform rules and would collect data from people who never agreed to it.
- Platform moderation data stays inside the platforms.

So we don't know which narratives are spreading, who they target, where, or how online harm leads to danger offline.

## 2. Our idea

**The women who see the harm become the way we see it.**

Laaha already has the trust of women and girls. We build on that trust instead of asking them to adopt something new. The Laaha app and website have to be useful and safe first, so that women keep coming back. Each time someone reports a post, a screenshot or an in-person incident, it adds one anonymous, moderated record that we could not collect any other way. Platform content only enters the dataset when a user submits it. We never scrape.

```
Woman sees harm ──► Report (online or offline, anonymous)
                         │
                         ▼
               Moderator verifies and tags it
                         │
                         ▼
               Anonymised export (no contact details)
                         │
                         ▼
     Trends and alerts for research, advocacy, platforms, partners
```

This data can show:

- which false narratives are growing, and after which events;
- coordinated campaigns (many reports of the same links within hours);
- **online lures followed by offline harm in the same region**, which only crowdsourced reports can connect.

## 3. Part 1: The Laaha app

A new mobile extension of Laaha: an installable web app that works offline and can hide itself on the phone.


| Feature | What it does | Status |
|---|---|---|
| Report harm | Anonymous step-by-step report of online or in-person harm | Built |
| Share from Instagram | One tap from any app's share menu into a quick report | Designed, [clickable mockup](https://claude.ai/artifact/LTgkamJAqkmL6T4jwCgjjC) |
| "Is it true?" chatbot | AI fact-check with sources, linked to reporting | Built |
| Find help | Map and directory of partner organisations | Built (demo partners) |
| Call | Emergency number, helplines, trusted people | Built (demo helplines) |
| SOS | Send your GPS location to trusted people by SMS or WhatsApp | Built |
| Discreet mode | The app disguises itself as a recipe app, notes app or game | Built |
| Quick exit | Leave the app instantly | Built |
| Guides and events | Offline safety guides, UN days and community events | Built |
| Languages | English, Polish, Ukrainian | Built |
| Offline | Installable app; reports queue and send when back online | Built |

### 3.1 Report harm

Reporting has two paths.

**Online.** One question per screen, so it feels quick:

1. Who was targeted: me, someone I know, a public woman (journalist, activist, politician), women in general, or "I'd rather not say".
2. What it was: fabricated story, manipulated image or video, harassment or pile-on, false claim to discredit, doxxing or exposure.
3. Where: Instagram, Reddit, Facebook, TikTok, X, WhatsApp, other.
4. Evidence, any one of which is enough: a link, up to 5 screenshots, or a few words. Plus roughly when it happened.
5. Send.

**In person.** One screen to tell the story in her own words, then who, what (verbal harassment, rumours, threats, being followed or watched, physical or sexual violence) and where (street, school, work, home, community). The town is optional and we ask for an area, never an exact address.

**Privacy by design**

- No account. Email is optional and only staff see it.
- Location and camera metadata are removed from photos **on the phone**, before upload.
- The form states plainly that every report is used anonymously for research. Sharing with partner organisations is a separate opt-in.
- By default no copy stays on the phone, because someone else might look at it. She can choose to keep a short entry in "My reports": a reference code, the type and the date.

**Safety and aftercare**

- Choosing threats, being followed or violence shows a "Call 112" button right away.
- After sending, the app explains what happens next (a moderator reviews it within about 3 working days), gives practical tips (don't reply, report it on the platform too, block, keep screenshots), and offers helplines if the report was about herself.

**Works offline.** Reports wait on the phone and send automatically when the connection returns, without duplicates.

### 3.2 Sharing directly from Instagram (designed, not built yet)

Today a user pastes the post link into the report form. The next step, fully specified in `openspec/changes/add-quick-report/`, makes reporting as easy as sharing a post with a friend.

**[Try the clickable mockup →](https://claude.ai/artifact/LTgkamJAqkmL6T4jwCgjjC)** Choose **Android: share menu** or **iPhone: button in the app** at the top, then follow the hints under the phone. The right side shows what the server does after Send, and a staff dashboard where you confirm the category and verify the report. Try **Verify** before **Confirm category**: the server refuses.

1. On a post in Instagram, TikTok, X or any app, she taps **Share → Laaha**.
2. Laaha opens a one-screen **Quick report** with the link already filled in, an optional screenshot and the research notice.
3. She taps **Send now**, or **Add details** to open the full form pre-filled.
4. The server detects the platform from the link, and Claude suggests a category. The report is marked **auto-filled**.
5. A moderator must confirm the category before the report counts in any export, so guesses never reach research data.

**Why not let women send posts to a Laaha Instagram account by DM?** We considered it and rejected it:

- The DM stays in her Instagram inbox, where someone checking her phone would see it.
- Laaha would learn her Instagram handle, so she would no longer be anonymous.
- Receiving DMs needs Meta's app review.

The phone's own share menu gives the same one-tap gesture without these risks. iPhones don't support web share targets, so iPhone users get a Quick report button on the home screen instead.

This is what turns casual scrolling into data collection: a woman who sees a harmful post can report it in two taps without leaving the app she is in.

### 3.3 "Is it true?" chatbot

- She pastes a claim or link, or uploads a screenshot.
- The assistant (Claude with web search) answers with a verdict (**Likely false / Misleading / Unverified / Likely true**), a confidence level and links to its sources. It says clearly that it can be wrong.
- It answers in the app's language (English, Polish or Ukrainian).
- From an answer she can:
  - **Report this post**: opens the report form pre-filled with the link and text;
  - **Ask a human to check**: sends it to moderators, marked "from fact-check".
- The conversation lives only in memory and disappears on exit.
- Without an API key, it gives labelled demo answers so the prototype still works.

Fact-check questions are a second, lower-effort way into the dataset.

### 3.4 Find help

- Directory and map of partner organisations: legal aid, counselling, shelters, digital-safety clinics, medical services.
- Search by name, city or service; filter by service and language.
- **Near me** sorts by distance. Her location is used on the phone only and never sent.
- Saved for offline use.

### 3.5 Call

- One-tap call to the local emergency number (112 by default, changeable in Settings).
- Helplines with opening hours, languages, and whether the call is free.
- **People I trust**: up to 5 personal contacts, stored only on the phone.
- Calls work without internet.

### 3.6 SOS button

A red **SOS** button is always visible in the header.

1. The app reads her GPS location and shows it on a map with its accuracy.
2. It writes a message: *"I need help. This is where I am: [map link] (within about 15 m, at 21:04). Please call me or send help."*
3. Next to each trusted person are **SMS** and **WhatsApp** buttons. She can also use the phone's share menu or copy the message.

**Her location never goes to the Laaha server.** It only goes to the people she chooses. SMS works without internet. In discreet mode, the SOS button looks like an ordinary "share location" pin.

### 3.7 Discreet mode, for women living with an abuser

Many women who need this app share a home, or a phone, with the person harming them. If that person picks up the phone, the app must not give her away.

**The app disguises itself as another app that really works.** She picks one:

- **Recipes**: 10 full recipes with ingredients, steps, favourites and search.
- **Notes**: a notes app with pinned notes and ordinary entries like "Shopping list" and "Dentist".
- **Memory**: a card-matching game with a move counter and best score.

If someone opens it and looks around, it holds up.

**Opening the real app**

- She types her secret code into the cover's search box, or into the game's "Bonus code" box. The box clears itself, so the code never stays on screen.
- Without a code, holding the title for 2 seconds opens it (less safe, and the app says so).

**How deep the disguise goes**

- The browser tab title and icon change to the cover app's.
- Inside the real app, labels become neutral: Report → "New", Is it true? → "Ask", Find help → "Places", Call → "People". Event names never mention violence.
- The app locks again when she taps **Lock**, closes it, or leaves it for more than a minute. That is long enough to send an SOS text and come back.

**Quick exit.** Outside discreet mode, the **Exit** button (or pressing Esc twice) replaces the page with a weather website. The back button won't return to Laaha. In discreet mode, Exit becomes Lock and returns to the cover app.

**Delete data on this phone** removes contacts, history, unsent reports and settings in one step.

### 3.8 Guides, events and languages

- **Safety guides**, readable offline: "Someone posted a fake story about me", "How to spot a manipulated image", "Lock down your accounts".
- **Events**: UN and UNICEF days (International Day of the Girl, 25 November, 16 Days of Activism, Safer Internet Day) and community events. "Add to calendar" creates the calendar file on the phone, without contacting any server.
- **Languages**: English, Polish and Ukrainian, chosen in Settings.

## 4. Part 2: New features on the Laaha website

The app is one way in. Many women will first meet Laaha on its existing website, so we also add features there.

> **[To be added by the team]** Describe each new website feature: what it does, who it helps, and how it connects to the app or to the collected data.

| Feature | What it does | Status |
|---|---|---|
| [feature 1] | [what it does] | [status] |
| [feature 2] | [what it does] | [status] |
| [feature 3] | [what it does] | [status] |

## 5. Part 3: Using the collected data

Reports are only useful if someone acts on them. This part shows the path from a single report to a decision:

1. **Moderate**: staff check each report and confirm its category.
2. **Export**: verified reports leave the system as anonymised data, with no contact details.
3. **Understand**: the insights page shows trends, where harm happens, and early warnings.
4. **Act**: [to be added: who uses the insights and how, for example UNICEF country offices, partner organisations, platforms, policymakers].

### 5.1 Moderation dashboard (staff)

At `/staff`, Laaha staff can:

- filter reports by status, online or in person, platform or place, category, and who was targeted;
- mark them verified, rejected or needs more info;
- tag them;
- see totals and breakdowns;
- **export an anonymised CSV** for research. Exports never contain contact details.

### 5.2 Insights page (synthetic data)

`insights-mockup/` shows what the collected data could look like after one year in one country. It uses about **2,500 invented reports** of misinformation and sexualisation aimed at **Ukrainian women living in Poland**, from October 2025 to September 2026, across all 16 voivodeships, in Polish, Ukrainian, Russian and English.

The page shows weekly trends by narrative, harm type by platform, regions, who was targeted, and automatic alerts. Three patterns are hidden in the data, and the page finds them:

| Pattern | What happens |
|---|---|
| Narrative spike | After a fictional benefits-policy debate, "taking jobs / abusing benefits" posts rise several times over for a month, mostly in Mazowieckie |
| Coordinated campaign | 45 reports in 48 hours about stolen photos on fake dating profiles, sharing only 3 links |
| Online lure, offline harm | Fake job and housing offers on Telegram and classifieds sites in Podkarpackie and Lubelskie, followed 3–4 weeks later by in-person reports of being followed or threatened in the same regions |

The third pattern is the main argument for this project: **no platform, and no scraper, can connect an online ad to what happened to a woman a month later in the street. Crowdsourced reports can.**

The dataset comes with a data card and a ground-truth file, so researchers can test analyses and models without touching real personal data. Every file and the page itself are labelled as synthetic.

### 5.3 [To be added]

> **[To be added by the team]** The further part showing how the collected information is used.

## 6. Safety, privacy and ethics

| Principle | How the prototype applies it |
|---|---|
| Collect as little as possible | No account, no names needed, email optional, area instead of address |
| Anonymous by default | Exports never contain contact details; reports are never published |
| Clear consent | Research use is stated before Send; partner sharing is opt-in |
| Nothing left behind on the phone | No local copy by default; one-tap delete; fact-check chat is not saved |
| Location stays with her | "Near me" and SOS run on the phone; the server never receives her location |
| Photos are cleaned | Metadata stripped on the phone before upload |
| Safe if the phone is seen | Discreet mode, secret code, auto-lock, quick exit |
| No scraping | Platform content enters only through user submissions |
| Humans check AI | AI-suggested categories must be confirmed by a moderator before export |
| Synthetic data stays separate | Demo dataset is labelled everywhere and never mixed with real reports |

## 7. How it is built

- **App**: React + TypeScript + Vite, as an installable offline web app (PWA). One codebase for Android, iPhone and desktop, with no app store listing that could give the user away.
- **Server**: Node + Express. Reports are stored in a JSON file for the prototype.
- **AI**: Claude API with web search for the fact-check assistant.
- **Maps**: Leaflet with OpenStreetMap tiles.
- **Specs**: every feature is specified with OpenSpec in `openspec/changes/`.

## 8. Demo script

A 4-minute path through everything you can open. Start the app and the insights page first, as shown in [Open the demo](#open-the-demo).

0. **Report from Instagram.** Open the [clickable mockup](https://claude.ai/artifact/LTgkamJAqkmL6T4jwCgjjC), tap the share arrow on the post, choose **Laaha**, and tap **Send now**. On the right, confirm the category and verify the report.

1. **Check a post.** Open http://localhost:5173/check and tap the example about a viral photo of a woman politician. Then tap **Report this post**.
2. **Report it offline.** In the developer tools, open the Network tab and set it to **Offline**. Finish the report: the app says it will send later. Set the network back to online and watch it send.
3. **SOS.** Open http://localhost:5173/sos and allow location to see the message and map.
4. **Discreet mode.** Open http://localhost:5173/settings, choose **Recipes**, set a code such as `1234`, and turn discreet mode on. You now see a recipe app. Type `1234` in the recipe search box to get back into Laaha.
5. **Moderate.** Open http://localhost:5173/staff, enter `laaha-demo`, verify the report you just sent, and export the anonymised CSV.
6. **See the bigger picture.** Open http://localhost:8080 and scroll to **Online lures, offline harm**.

## 9. What's next

1. **Share from Instagram and other apps** (quick report), already specified.
2. Connect the app and the Laaha website: shared content, navigation and entry points.
3. Encrypt data stored on the phone, and add a PIN lock.
4. Real staff accounts with roles, an audit log, and a real database.
5. Onboard real partner organisations and helplines, country by country.
6. A privacy impact assessment and a published privacy notice before any real data is collected.
7. Later phases: chat with support workers, a safer emergency tracker (after a security review), and sharing verified trends with platforms and policymakers.

## 10. Team

| Name | Role |
|---|---|
| Ema Greganova | |
| [name2] | |
| [name3] | |
| [name4] | |
| [name5] | |
| [name6] | |
| [name7] | |
| [name8] | |
