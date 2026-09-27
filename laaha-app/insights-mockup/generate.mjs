#!/usr/bin/env node
// Generates a SYNTHETIC dataset of reports about gendered misinformation and
// hypersexualisation targeting Ukrainian women in Poland. Every row is invented.
//
//   node insights-mockup/generate.mjs [--seed=N]
//
// Same seed, same bytes. No dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'data');
const BASENAME = 'laaha-poland-synthetic';
const DEFAULT_SEED = 20260926;
const seedArg = process.argv.find((a) => a.startsWith('--seed='));
const SEED = seedArg ? Number(seedArg.slice(7)) : DEFAULT_SEED;
if (!Number.isInteger(SEED)) throw new Error('--seed must be an integer');

const NOTICE =
  'SYNTHETIC DEMO DATA. Every report is invented by insights-mockup/generate.mjs. ' +
  'It does not describe real people or events and must not be mixed with real reports.';

// ---- Seeded random numbers ----

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const chance = (p) => rand() < p;
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pickOne = (list) => list[Math.floor(rand() * list.length)];
/** Picks a key from { value: weight }. */
function pick(weights) {
  const entries = Object.entries(weights);
  let r = rand() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [value, w] of entries) if ((r -= w) < 0) return value;
  return entries[entries.length - 1][0];
}
function poisson(mean) {
  const l = Math.exp(-mean);
  let k = 0;
  for (let p = rand(); p > l; p *= rand()) k++;
  return k;
}
function gauss() {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

// ---- Dates (all UTC) ----

const DAY = 86400000;
const START = Date.UTC(2025, 9, 1); // 1 Oct 2025
const END = Date.UTC(2026, 8, 30); // 30 Sep 2026
const utc = (s) => Date.parse(`${s}T00:00:00Z`);
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
function weekStart(t) {
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  return Math.floor(t / DAY) * DAY - dow * DAY;
}
function isoWeek(t) {
  const d = new Date(weekStart(t) + 3 * DAY); // Thursday decides the year
  const year = d.getUTCFullYear();
  const week = Math.floor((d - Date.UTC(year, 0, 1)) / (7 * DAY)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}
/** A random time on the given day, with more reports in the evening. */
const timeOn = (day) => day + Math.floor(Math.min(0.999, Math.max(0, 0.62 + gauss() * 0.2)) * DAY);

// ---- Value tables ----

const REGIONS = {
  Mazowieckie: 20, 'Małopolskie': 11, 'Dolnośląskie': 10, Podkarpackie: 8, Lubelskie: 8, Pomorskie: 8, Wielkopolskie: 8,
  'Śląskie': 8, 'Łódzkie': 4, Zachodniopomorskie: 3, 'Kujawsko-pomorskie': 3, Podlaskie: 2.5, 'Warmińsko-mazurskie': 2,
  'Świętokrzyskie': 1.5, Lubuskie: 1.5, Opolskie: 1.5,
};
const CITY = {
  Mazowieckie: 'Warsaw', 'Małopolskie': 'Kraków', 'Dolnośląskie': 'Wrocław', Podkarpackie: 'Rzeszów', Lubelskie: 'Lublin',
  Pomorskie: 'Gdańsk', Wielkopolskie: 'Poznań', 'Śląskie': 'Katowice', 'Łódzkie': 'Łódź', Zachodniopomorskie: 'Szczecin',
  'Kujawsko-pomorskie': 'Bydgoszcz', Podlaskie: 'Białystok', 'Warmińsko-mazurskie': 'Olsztyn', 'Świętokrzyskie': 'Kielce',
  Lubuskie: 'Zielona Góra', Opolskie: 'Opole',
};

const N = {
  seduce: 'Came to seduce / steal husbands',
  brides: 'Available women / brides',
  sexwork: 'Sex work stereotypes',
  benefits: 'Abusing benefits / taking jobs',
  criminal: 'Criminal or dangerous',
  lures: 'Fake offers (lures)',
  stolen: 'Stolen photos / fake profiles',
  other: 'Other or unclear',
  none: 'None (in person)',
};
const ONLINE_NARRATIVES = { seduce: 18, brides: 14, sexwork: 12, benefits: 16, criminal: 12, lures: 10, stolen: 10, other: 8 };

const C = {
  sexualised: 'Sexualised content or stereotypes',
  offer: 'Fake job, housing or relationship offer',
  fabricated: 'Fabricated story',
  manipulated: 'Manipulated image or video',
  harassment: 'Harassment or pile-on',
  discredit: 'False claim to discredit',
  doxxing: 'Doxxing or exposure',
  otherOnline: 'Other (online)',
  verbal: 'Verbal harassment or insults',
  sexualComments: 'Unwanted sexual comments or propositions',
  rumours: 'Rumours or lies spread about her',
  threats: 'Threats or intimidation',
  followed: 'Being followed or watched',
  physical: 'Physical or sexual violence',
  otherInPerson: 'Other (in person)',
};
const CATEGORY_BY_NARRATIVE = {
  seduce: { sexualised: 55, harassment: 25, fabricated: 20 },
  brides: { sexualised: 60, manipulated: 20, harassment: 20 },
  sexwork: { sexualised: 45, discredit: 25, harassment: 20, doxxing: 10 },
  benefits: { discredit: 60, fabricated: 30, harassment: 10 },
  criminal: { fabricated: 60, manipulated: 15, harassment: 25 },
  lures: { offer: 100 },
  stolen: { manipulated: 70, doxxing: 30 },
  other: { harassment: 40, doxxing: 20, fabricated: 20, otherOnline: 20 },
};
const IN_PERSON_CATEGORIES = { verbal: 32, sexualComments: 20, rumours: 13, threats: 13, followed: 9, physical: 8, otherInPerson: 5 };

const PLATFORM_BY_CATEGORY = {
  sexualised: { TikTok: 30, Instagram: 30, X: 15, Facebook: 10, Telegram: 10, Other: 5 },
  offer: { Telegram: 40, 'Classifieds site': 35, Facebook: 15, WhatsApp: 10 },
  manipulated: { TikTok: 35, Instagram: 35, Telegram: 10, X: 10, Facebook: 10 },
  harassment: { X: 30, Instagram: 20, TikTok: 20, Facebook: 20, Telegram: 5, Other: 5 },
  discredit: { Facebook: 40, X: 35, TikTok: 10, Telegram: 10, Other: 5 },
  fabricated: { Facebook: 40, X: 20, Telegram: 20, TikTok: 15, Other: 5 },
  doxxing: { Telegram: 35, X: 25, Facebook: 15, Instagram: 15, WhatsApp: 10 },
  otherOnline: { Instagram: 15, TikTok: 15, Facebook: 15, X: 15, Telegram: 15, WhatsApp: 10, Other: 15 },
};
const PLACES = {
  'Street or public transport': 30, Workplace: 20, 'Accommodation or housing': 15, 'School or university': 10,
  'Shop or service': 10, 'Community or religious place': 5, Other: 10,
};

function language(mode, narrative, platform) {
  if (mode === 'in-person') return pick({ PL: 85, UA: 10, RU: 5 });
  if (narrative === 'lures') return pick({ UA: 50, RU: 35, PL: 15 });
  if (platform === 'Telegram') return pick({ PL: 40, RU: 35, UA: 25 });
  return pick({ PL: 80, EN: 10, UA: 7, RU: 3 });
}
function targetType(mode, narrative) {
  if (mode === 'in-person') return pick({ 'Herself': 70, 'Someone she knows': 30 });
  if (narrative === 'stolen') return pick({ 'Herself': 60, 'Someone she knows': 30, 'Public figure': 10 });
  if (narrative === 'lures') return pick({ 'Ukrainian women as a group': 60, 'Herself': 30, 'Someone she knows': 10 });
  return pick({ 'Ukrainian women as a group': 45, 'Herself': 25, 'Someone she knows': 15, 'Public figure': 15 });
}
function ageBand(target, narrative) {
  if (target === 'Ukrainian women as a group' && chance(0.6)) return 'Unknown';
  if (narrative === 'lures') return pick({ '13-17': 12, '18-29': 55, '30-49': 20, '50+': 3, Unknown: 10 });
  return pick({ '13-17': 8, '18-29': 40, '30-49': 30, '50+': 5, Unknown: 17 });
}
function evidenceType(mode) {
  if (mode === 'in-person') return pick({ 'Description only': 85, Photo: 15 });
  return pick({ 'Link and screenshot': 35, 'Link only': 25, 'Screenshot only': 25, 'Description only': 15 });
}

// ---- Descriptions: paraphrase what was reported, never reproduce it ----

const FORMATS = ['Video', 'Meme', 'Post', 'Short clip', 'Comment thread', 'Carousel post'];
const JOBS = ['hostess', 'model', 'cleaning', 'care worker', 'seasonal farm', 'hotel', 'nanny', 'massage salon'];
const TEMPLATES = {
  seduce: [
    '{format} on {platform} claims Ukrainian women come to Poland to find Polish husbands.',
    '{format} mocks Ukrainian women as only interested in men with money; many replies agree.',
    'Comments under a local news story say Ukrainian women "take" Polish men and break up families.',
    '{format} uses a sexualised stereotype of Ukrainian women to joke about Polish wives.',
  ],
  brides: [
    'Page advertises "Ukrainian brides" using photos that appear to be taken from a refugee support group.',
    '{format} presents Ukrainian women as available for dating in exchange for help with housing.',
    'Account shares sexualised images captioned as Ukrainian women "looking for a husband".',
    '{format} ranks Ukrainian women by appearance and invites men to "choose one".',
  ],
  sexwork: [
    '{format} claims Ukrainian women arriving in Poland mostly work in the sex industry.',
    'Post suggests a reception point in {city} is used for sex work; no evidence given.',
    '{format} describes Ukrainian women as "easy" and links this to the war; widely shared.',
    'Comments call a Ukrainian woman a sex worker after she posted about her new job.',
  ],
  benefits: [
    'Post claims Ukrainian women receive more benefits than Polish families; the figures are invented.',
    '{format} says Ukrainian mothers abuse child benefits and take kindergarten places.',
    'Chart with false numbers about benefits paid to Ukrainian women, shared as if official.',
    '{format} claims Ukrainian women take jobs from Polish women while living on benefits.',
  ],
  benefitsSpike: [
    'After the benefits-policy debate, a post claims Ukrainian women get priority for social housing; no source.',
    '{format} repeats the claim from the benefits-policy debate that Ukrainian mothers are paid more than Polish mothers.',
    'Many near-identical posts say Ukrainian women "live on Polish taxes"; figures do not match official data.',
    '{format} calls for benefits for Ukrainian women to be cut and describes them as lazy.',
  ],
  criminal: [
    'Fabricated story says a Ukrainian woman stole from her employer; the photo is from another country.',
    '{format} claims Ukrainian women run scams targeting elderly people; no source.',
    'Old crime story from another country reshared as if it happened in {city} with a Ukrainian woman.',
    '{format} claims Ukrainian women bring disease and crime; uses an unrelated photo.',
  ],
  lures: [
    'Ad offers a well-paid {job} job with free housing and travel, and asks for a passport photo first.',
    'Message offers a free room to young Ukrainian women "in exchange for help around the house".',
    'Post offers help finding a "sponsor" for women who have just arrived.',
    'Ad for {job} work abroad through Poland, no company name, contact by private chat only.',
    'Offer of a {job} job near {city} with pay far above normal, asks women to send full-length photos.',
  ],
  stolen: [
    'Dating profile uses photos of a Ukrainian woman without her consent.',
    'Edited photo puts a Ukrainian woman\'s face on a sexualised image; shared in a group.',
    'Fake account copies a woman\'s profile photos and messages men pretending to be her.',
    'Photos from a Ukrainian woman\'s private account reposted on a page with sexual captions.',
  ],
  other: [
    'Pile-on in the comments after a Ukrainian woman spoke about her work in local media.',
    'Her home area and phone number were posted in a hostile group.',
    '{format} targets a Ukrainian woman activist with insults and false claims about her past.',
    'Hostile messages sent to several Ukrainian women in a local community group.',
  ],
  verbal: [
    'Shouted at on public transport in {city} for speaking Ukrainian.',
    'Insulted by a customer at work after they heard her accent.',
    'Group of men called her names linked to her nationality in the street.',
  ],
  sexualComments: [
    'Man at her workplace made sexual comments and suggested she was "available" because she is Ukrainian.',
    'Stranger asked whether she was "one of those Ukrainian girls" and made sexual remarks.',
    'Landlord made sexual comments and hinted rent could be "paid another way".',
  ],
  rumours: [
    'Neighbours spread a rumour that she came to Poland to find a husband.',
    'Colleagues told others she got her job through a relationship with the manager.',
    'Parents at school said she had a "bad reputation" because she is Ukrainian.',
  ],
  threats: [
    'Employer threatened to report her to the authorities if she complained about pay.',
    'Man told her to leave the neighbourhood or "something would happen".',
    'Former partner threatened to share private photos.',
  ],
  followed: [
    'Followed from the bus stop to her accommodation twice in one week.',
    'Same car seen waiting outside her workplace several evenings.',
    'Man she did not know kept appearing near her building and watching the entrance.',
  ],
  physical: [
    'Grabbed by a man in the street after refusing to talk to him.',
    'Pushed and hit by a stranger who shouted about Ukrainians.',
    'Touched without consent by a co-worker; the manager did nothing.',
  ],
  otherInPerson: [
    'Refused service and humiliated in a shop because she is Ukrainian.',
    'Treated in a degrading way at an office when asking for help.',
  ],
  offlineFollowup: [
    'Man who posted a housing offer online waited outside her accommodation after she refused.',
    'Person behind a job ad she answered kept calling and turned up at her workplace.',
    'Followed after meeting someone who offered work through a chat channel.',
    'Threatened by a man from an online job offer when she would not go with him.',
    'The "employer" from an online ad kept her documents and threatened her when she asked for them back.',
  ],
};
function describe(key, { platform, region }) {
  return pickOne(TEMPLATES[key])
    .replace('{format}', pickOne(FORMATS))
    .replace('{platform}', platform ?? 'social media')
    .replace('{job}', pickOne(JOBS))
    .replace('{city}', CITY[region]);
}

// ---- Report builders ----

const usedClusters = new Set();
function newCluster() {
  let id;
  do id = `LC-${randInt(10000, 99999)}`;
  while (usedClusters.has(id));
  usedClusters.add(id);
  return id;
}

/** Builds one report. `force` overrides any drawn value. */
function makeReport(day, force = {}) {
  const mode = force.mode ?? (chance(0.75) ? 'online' : 'in-person');
  const region = force.region ?? pick(REGIONS);
  const r = { created_at: timeOn(day), mode, region, pattern: force.pattern ?? 'none' };
  if (mode === 'online') {
    const nk = force.narrative ?? pick(ONLINE_NARRATIVES);
    const ck = force.category ?? pick(CATEGORY_BY_NARRATIVE[nk]);
    r.narrative = N[nk];
    r.category = C[ck];
    r.platform = force.platform ?? pick(PLATFORM_BY_CATEGORY[ck]);
    r.place = null;
    r.content_language = force.language ?? language(mode, nk, r.platform);
    r.target_type = targetType(mode, nk);
    r.target_age_band = ageBand(r.target_type, nk);
    r.evidence_type = force.evidence ?? evidenceType(mode);
    r.link_cluster = r.evidence_type.startsWith('Link') ? (force.cluster ?? newCluster()) : null;
    r.description = describe(force.template ?? nk, r);
  } else {
    const ck = force.category ?? pick(IN_PERSON_CATEGORIES);
    r.narrative = N.none;
    r.category = C[ck];
    r.platform = null;
    r.place = force.place ?? pick(PLACES);
    r.content_language = language(mode);
    r.target_type = targetType(mode);
    r.target_age_band = ageBand(r.target_type);
    r.evidence_type = evidenceType(mode);
    r.link_cluster = null;
    r.description = describe(force.template ?? ck, r);
  }
  return r;
}

const reports = [];

// Baseline: about 35 a week at the start, growing to about 50, fewer at weekends.
for (let day = START; day <= END; day += DAY) {
  const progress = (day - START) / (END - START);
  const weekly = 35 + 15 * progress;
  const weekend = [0, 6].includes(new Date(day).getUTCDay());
  const n = poisson((weekly / 7) * (weekend ? 0.8 : 1.08));
  for (let i = 0; i < n; i++) reports.push(makeReport(day));
}

// Pattern A: "abusing benefits" spike after a fictional benefits-policy debate, 9 Feb to 8 Mar 2026.
for (let day = utc('2026-02-09'); day <= utc('2026-03-08'); day += DAY) {
  const n = poisson(3.2);
  for (let i = 0; i < n; i++)
    reports.push(
      makeReport(day, {
        pattern: 'A_benefits_spike',
        mode: 'online',
        narrative: 'benefits',
        category: chance(0.75) ? 'discredit' : 'fabricated',
        platform: pick({ X: 50, Facebook: 45, TikTok: 5 }),
        region: chance(0.7) ? 'Mazowieckie' : pick(REGIONS),
        language: 'PL',
        template: 'benefitsSpike',
      }),
    );
}

// Pattern B: coordinated campaign, 45 reports in 48 hours from 14 Apr 2026, sharing 3 links
// (a fixed 22 / 13 / 10 split, so the main link always clears the page's 20-report alert).
const campaignClusters = [newCluster(), newCluster(), newCluster()];
const campaignStart = utc('2026-04-14') + 8 * 3600000;
for (let i = 0; i < 45; i++) {
  const r = makeReport(utc('2026-04-14'), {
    pattern: 'B_coordinated_campaign',
    mode: 'online',
    narrative: 'stolen',
    category: 'manipulated',
    platform: pick({ TikTok: 50, Instagram: 45, Telegram: 5 }),
    evidence: chance(0.6) ? 'Link and screenshot' : 'Link only',
    cluster: campaignClusters[i < 22 ? 0 : i < 35 ? 1 : 2],
  });
  // Front-loaded: most reports in the first day.
  r.created_at = campaignStart + Math.floor(Math.pow(rand(), 1.6) * 47 * 3600000);
  reports.push(r);
}

// Pattern C: lure ads on Telegram and classifieds in the border voivodeships, 1 Jun to 20 Jul 2026,
// then in-person harm in the same voivodeships 3 to 4 weeks later.
for (let day = utc('2026-06-01'); day <= utc('2026-07-20'); day += DAY) {
  const n = poisson(1.45);
  for (let i = 0; i < n; i++) {
    const region = chance(0.5) ? 'Podkarpackie' : 'Lubelskie';
    reports.push(
      makeReport(day, {
        pattern: 'C_lure_ads',
        mode: 'online',
        narrative: 'lures',
        platform: pick({ Telegram: 55, 'Classifieds site': 45 }),
        language: pick({ UA: 55, RU: 40, PL: 5 }),
        region,
      }),
    );
    if (chance(0.6)) {
      reports.push(
        makeReport(day + randInt(21, 28) * DAY, {
          pattern: 'C_offline_followup',
          mode: 'in-person',
          category: pick({ followed: 45, threats: 40, sexualComments: 15 }),
          place: pick({ Workplace: 35, 'Accommodation or housing': 35, 'Street or public transport': 30 }),
          template: 'offlineFollowup',
          region,
        }),
      );
    }
  }
}

// ---- Moderation status and review time ----

const B_END = utc('2026-04-21');
for (const r of reports) {
  const ageDays = (END - r.created_at) / DAY;
  const thin = r.evidence_type === 'Description only';
  if (chance(ageDays < 42 ? 0.45 : 0.03)) r.status = 'pending';
  else r.status = pick({ verified: thin ? 60 : 88, rejected: thin ? 20 : 6, 'needs more info': thin ? 20 : 6 });
  if (r.status === 'pending') r.hours_to_review = null;
  else {
    const overload = r.created_at >= campaignStart && r.created_at < B_END ? 3 : 1;
    r.hours_to_review = Math.round(Math.exp(Math.log(18) + gauss() * 0.8) * overload * 10) / 10;
  }
}

// ---- Rows ----

reports.sort((a, b) => a.created_at - b.created_at || a.region.localeCompare(b.region) || a.description.localeCompare(b.description));

const COLUMNS = [
  ['report_id', 'Synthetic id, PL-000001 upwards in date order'],
  ['data_source', 'Always "synthetic-demo". Keeps rows recognisable if they are ever copied elsewhere'],
  ['created_at', 'When the report was sent (UTC, ISO 8601)'],
  ['date', 'Date part of created_at (YYYY-MM-DD)'],
  ['iso_week', 'ISO week of created_at, e.g. 2026-W07'],
  ['week_start', 'Monday of that ISO week (YYYY-MM-DD)'],
  ['month', 'YYYY-MM'],
  ['mode', '"online" or "in-person"'],
  ['category', 'What form the harm took'],
  ['narrative', 'Which story was being spread (online), or "None (in person)"'],
  ['platform', 'Online reports only'],
  ['place', 'In-person reports only'],
  ['region', 'Polish voivodeship of the person reporting'],
  ['content_language', 'PL, UA, RU or EN'],
  ['target_type', 'Who was targeted'],
  ['target_age_band', '13-17, 18-29, 30-49, 50+ or Unknown'],
  ['evidence_type', 'What the report included'],
  ['link_cluster', 'Fictional id standing in for the reported link. Reports of the same link share an id'],
  ['status', 'Moderation status: verified, pending, rejected or needs more info'],
  ['hours_to_review', 'Hours from report to moderation decision; empty while pending'],
  ['description', 'Short paraphrase of what was reported. Never the original content'],
];

const rows = reports.map((r, i) => ({
  report_id: `PL-${String(i + 1).padStart(6, '0')}`,
  data_source: 'synthetic-demo',
  created_at: new Date(r.created_at).toISOString().slice(0, 19) + 'Z',
  date: ymd(r.created_at),
  iso_week: isoWeek(r.created_at),
  week_start: ymd(weekStart(r.created_at)),
  month: ymd(r.created_at).slice(0, 7),
  mode: r.mode,
  category: r.category,
  narrative: r.narrative,
  platform: r.platform,
  place: r.place,
  region: r.region,
  content_language: r.content_language,
  target_type: r.target_type,
  target_age_band: r.target_age_band,
  evidence_type: r.evidence_type,
  link_cluster: r.link_cluster,
  status: r.status,
  hours_to_review: r.hours_to_review,
  description: r.description,
}));
const truth = reports.map((r, i) => [rows[i].report_id, r.pattern]);
const count = (p) => truth.filter(([, x]) => x === p).length;

// ---- Write files ----

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (header, lines) => [header, ...lines].map((l) => l.map(csvCell).join(',')).join('\n') + '\n';

const names = COLUMNS.map(([n]) => n);
const json = { notice: NOTICE, seed: SEED, columns: names, rows };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `${BASENAME}.csv`), toCsv(names, rows.map((r) => names.map((n) => r[n]))));
fs.writeFileSync(path.join(OUT, `${BASENAME}.json`), JSON.stringify(json, null, 1) + '\n');
fs.writeFileSync(
  path.join(OUT, `${BASENAME}.data.js`),
  `// ${NOTICE}\n// Generated by generate.mjs so index.html can load the data from disk without a server.\nwindow.MOCK_DATA = ${JSON.stringify(json)};\n`,
);
fs.writeFileSync(path.join(OUT, 'ground-truth.synthetic.csv'), toCsv(['report_id', 'pattern'], truth));
fs.writeFileSync(path.join(OUT, 'DATA_CARD.md'), dataCard());

console.log(`Seed ${SEED}: ${rows.length} synthetic reports written to ${path.relative(process.cwd(), OUT)}/`);
console.log(`  A ${count('A_benefits_spike')} · B ${count('B_coordinated_campaign')} · C lures ${count('C_lure_ads')} · C offline ${count('C_offline_followup')}`);

function dataCard() {
  const values = (col) => [...new Set(rows.map((r) => r[col]).filter((v) => v != null))].sort();
  const listed = ['mode', 'category', 'narrative', 'platform', 'place', 'region', 'content_language', 'target_type', 'target_age_band', 'evidence_type', 'status'];
  return `# Data card: Laaha Poland synthetic reports

> **${NOTICE}**

## What this is

${rows.length} invented reports of gendered misinformation, hypersexualisation and related harm aimed at Ukrainian women living in Poland, dated 1 October 2025 to 30 September 2026. The dataset shows what the Laaha app's reports could look like after a year in one country, so that analysts can explore patterns and researchers can build and test models without touching real personal data.

Generated by \`insights-mockup/generate.mjs\` with seed \`${SEED}\`. The same seed always gives the same files. Run \`npm run mock:generate -- --seed=N\` for a different sample with the same patterns.

## Files

| File | Contents |
|---|---|
| \`${BASENAME}.csv\` | The dataset, one row per report. No pattern labels |
| \`${BASENAME}.json\` | Same rows as JSON (\`rows\`), with \`notice\`, \`seed\` and \`columns\` |
| \`${BASENAME}.data.js\` | Same JSON as a script, used by the insights page |
| \`ground-truth.synthetic.csv\` | \`report_id,pattern\` for every row. Use it only to score an analysis or model |
| \`DATA_CARD.md\` | This file |

## Columns

| Column | Description |
|---|---|
${COLUMNS.map(([n, d]) => `| \`${n}\` | ${d} |`).join('\n')}

Empty cells (CSV) and \`null\` (JSON) mean "does not apply", for example \`platform\` on an in-person report.

### Values

${listed.map((c) => `- **${c}**: ${values(c).join(' · ')}`).join('\n')}

## How it was generated

1. **Baseline**: a Poisson number of reports per day, averaging about 35 a week in October 2025 and growing to about 50 a week by September 2026, with fewer at weekends and more in the evening.
2. **Each report**: mode (about 75% online), then region (weighted towards Mazowieckie, the large host cities and the border voivodeships), then narrative, then a category that fits the narrative, then a platform that fits the category, then language, target and age band. In-person reports get a place instead of a platform.
3. **Moderation**: most reports are verified. Reports from the last 6 weeks are often still pending, and reports with only a description are more often rejected or marked "needs more info". Review time is log-normal around 18 hours.
4. **Descriptions** are picked from short paraphrase templates. They never contain slurs, explicit wording, real links, handles or personal names. City names come only from the report's region.

## Planted patterns

Three patterns are added on top of the baseline. They are labelled in \`ground-truth.synthetic.csv\`, not in the dataset.

| Label | Rows | What was planted |
|---|---|---|
| \`A_benefits_spike\` | ${count('A_benefits_spike')} | After a fictional benefits-policy debate, the "${N.benefits}" narrative rises to several times its normal weekly volume from 9 February to 8 March 2026, mostly on X and Facebook, in Polish, about 70% in Mazowieckie |
| \`B_coordinated_campaign\` | ${count('B_coordinated_campaign')} | 45 reports within 48 hours from 14 April 2026 about stolen photos used on fake dating profiles and sexualised edits, mostly TikTok and Instagram, spread across Poland and sharing 3 link clusters. Moderation is slower that week |
| \`C_lure_ads\` | ${count('C_lure_ads')} | From 1 June to 20 July 2026, fake job, housing and "sponsor" offers on Telegram and classifieds sites, mostly in Ukrainian or Russian, in Podkarpackie and Lubelskie |
| \`C_offline_followup\` | ${count('C_offline_followup')} | About 60% of those lures are followed 3 to 4 weeks later by an in-person report (followed, threatened, sexual propositions) in the same voivodeship, at work, at accommodation or in the street |

Everything else is labelled \`none\`.

## Suggested uses

- Trend and anomaly detection: can you find pattern A without being told the dates?
- Campaign detection: cluster by \`link_cluster\`, time and description to find pattern B.
- Lagged analysis: does online lure activity in a region predict in-person reports weeks later (pattern C)?
- Forecasting weekly volume for staffing moderators.
- Text classification of \`description\` into \`category\` or \`narrative\`.

## Limits

- **Invented.** Volumes, proportions and regional weights are plausible guesses, not calibrated to any real data. Do not quote any figure from this dataset as a finding about Poland.
- **Trigger events are fictional.** Nothing here should be read as a claim about a real debate, campaign, state, group or person.
- **Descriptions are templated**, so text models will find them far easier than real reports.
- **Planted patterns are strong and clean.** Detection rules tuned on this dataset will need re-tuning on real data.
- **Richer than the real export.** The Laaha app's real export has only month, category, platform or place, and no region or text. This dataset shows what a privacy-reviewed research tier could support. It does not describe what the app collects today.
- **Individual risk is out of scope.** Use it for aggregate patterns, not to score people.
`;
}
