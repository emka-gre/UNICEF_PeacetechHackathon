# UNICEF PeaceTech Hackathon 2026: Laaha extension

Our answer to the UNICEF challenge at the PeaceTech Hackathon 2026 (EPFL): *How might we protect women and girls in crisis from gendered disinformation?*

> **Hackathon judges:** start with **[docs/SUBMISSION.md](docs/SUBMISSION.md)**, or read the same summary as a **[web page](https://claude.ai/artifact/JWB8J6KspVsKcXHQNhpqFf)**.

## What's in this repository

| Folder | What it is | Start here |
|---|---|---|
| [`laaha-app/`](laaha-app/) | The Laaha app (offline-first PWA for reporting harm and finding help), the staff dashboard, and the insights mockup built on synthetic reports | [`laaha-app/README.md`](laaha-app/README.md) |
| [`analysis-dashboard/`](analysis-dashboard/) | The Laaha Analysis Dashboard: tracks hostile narratives about Ukrainian women in about 80 million Russian- and Ukrainian-language Telegram posts, by theme and over time, next to (synthetic) Laaha report counts | [`analysis-dashboard/README.md`](analysis-dashboard/README.md) |
| [`docs/`](docs/) | The submission write-up | [`docs/SUBMISSION.md`](docs/SUBMISSION.md) |
| [`openspec/`](openspec/) | Specs and plans for the app | |

## Run them

**Laaha app** (Node.js 20 or newer):

```bash
cd laaha-app
npm install
npm run dev          # app: http://localhost:5173, staff dashboard: http://localhost:5173/staff
```

**Analysis dashboard** (Python 3.9 or newer). The Overview page works straight away; the other pages need the Telegram dataset and pipeline described in its README.

```bash
cd analysis-dashboard
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py  # http://localhost:8501
```

## Team

- Ema Greganova
- Mia Reynolds 
- Paula Dias Leite
- Cecile
- Maria Achour
- Aymane Chokri
- Elizabeth Mesok
- Juliette Gress
