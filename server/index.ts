import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLE_VERSION, CATEGORIES, STATUSES, type ChatTurn, type ReportInput, type Status, type StoredReport, validateReport } from '../src/shared.ts';
import { factCheck } from './factcheck.ts';
import { guides, helplines, partners } from './seed.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(here, 'data', 'db.json');
const PORT = Number(process.env.PORT ?? 3001);
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'laaha-demo';

// ---- Tiny JSON file "database" ----

interface Db {
  reports: StoredReport[];
  // Kept apart from reports so it can never end up in an export.
  contacts: Record<string, string>;
}

function loadDb(): Db {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { reports: [], contacts: {} };
  }
}

const db = loadDb();
// Reports saved before the online/in-person choice existed were all online.
for (const r of db.reports) r.mode ??= 'online';

function saveDb() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// ---- App ----

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(express.json({ limit: '40mb' }));

app.get('/api/bundle', (_req, res) => {
  res.json({ version: BUNDLE_VERSION, partners, guides, helplines, updatedAt: new Date().toISOString() });
});

// Public report submission. Deliberately no logging of IP or user agent.
app.post('/api/reports', (req, res) => {
  const input = req.body as ReportInput;
  const error = validateReport(input);
  if (error) return res.status(400).json({ error });
  if (input.images.some((img) => !/^data:image\/(jpeg|png|webp);base64,/.test(img)))
    return res.status(400).json({ error: 'Screenshots must be JPEG, PNG or WebP' });

  // Idempotent: a retried sync of the same report is a no-op.
  if (db.reports.some((r) => r.id === input.id)) return res.json({ id: input.id, duplicate: true });

  const report: StoredReport = {
    id: input.id,
    mode: input.mode ?? 'online',
    victim: input.victim,
    category: input.category,
    platform: input.mode === 'in-person' ? undefined : input.platform,
    place: input.mode === 'in-person' ? input.place : undefined,
    area: input.mode === 'in-person' ? input.area?.trim() || undefined : undefined,
    link: input.link?.trim() || undefined,
    description: input.description?.trim() || undefined,
    incidentDate: input.incidentDate || undefined,
    images: input.images,
    consentResearch: input.consentResearch === true,
    consentPartners: input.consentPartners === true,
    createdAt: new Date().toISOString(),
    status: 'pending',
    tags: input.origin === 'fact-check' ? ['from fact-check'] : [],
    origin: input.origin === 'fact-check' ? 'fact-check' : 'form',
  };
  db.reports.push(report);
  if (input.contactEmail?.trim()) db.contacts[report.id] = input.contactEmail.trim();
  saveDb();
  res.status(201).json({ id: report.id });
});

// Fact-check assistant. The conversation is not stored.
app.post('/api/factcheck', async (req, res) => {
  const history = (req.body?.history ?? []) as ChatTurn[];
  if (!Array.isArray(history) || history.length === 0 || history.length > 20)
    return res.status(400).json({ error: 'Send between 1 and 20 messages' });
  if (history[history.length - 1].role !== 'user') return res.status(400).json({ error: 'Last message must be from the user' });
  try {
    res.json(await factCheck(history, typeof req.body?.lang === 'string' ? req.body.lang : 'en'));
  } catch (err) {
    console.error('factcheck failed:', (err as Error).message);
    res.status(502).json({ error: 'The assistant is not available right now. Please try again.' });
  }
});

// ---- Staff (demo auth: one shared password) ----

function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (req.get('x-staff-password') !== STAFF_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  next();
}

app.get('/api/staff/reports', requireStaff, (_req, res) => {
  const list = [...db.reports]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({ ...r, contactEmail: db.contacts[r.id] }));
  res.json(list);
});

app.patch('/api/staff/reports/:id', requireStaff, (req, res) => {
  const report = db.reports.find((r) => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found' });
  const { status, tags, category } = req.body as Partial<StoredReport>;
  if (status && STATUSES.includes(status as Status)) report.status = status;
  if (category && CATEGORIES.includes(category)) report.category = category;
  if (Array.isArray(tags)) report.tags = tags.map(String).map((t) => t.trim()).filter(Boolean);
  saveDb();
  res.json(report);
});

app.get('/api/staff/stats', requireStaff, (_req, res) => {
  const count = (key: 'category' | 'platform' | 'place' | 'status' | 'victim' | 'mode') => {
    const counts: Record<string, number> = {};
    for (const r of db.reports) {
      const k = r[key];
      if (!k) continue; // e.g. platform on an in-person report
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  };
  res.json({ total: db.reports.length, byCategory: count('category'), byPlatform: count('platform'), byStatus: count('status'), byVictim: count('victim'), byMode: count('mode'), byPlace: count('place') });
});

// Anonymised export: only verified reports with research consent, only non-identifying columns.
app.get('/api/staff/export.csv', requireStaff, (_req, res) => {
  const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = db.reports
    .filter((r) => r.status === 'verified' && r.consentResearch)
    .map((r) => {
      const month = (r.incidentDate ?? r.createdAt).slice(0, 7); // YYYY-MM
      // The in-person "area" is left out on purpose: a neighbourhood can identify someone.
      return [r.mode ?? 'online', r.victim ?? 'unknown', r.category, r.platform ?? r.place ?? '', month, r.tags.join('; '), r.status]
        .map(csvCell)
        .join(',');
    });
  res.type('text/csv').send(['mode,target,category,platform_or_place,month,tags,status', ...rows].join('\n') + '\n');
});

// ---- Serve the built app in production ----

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(here, '..', 'dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
