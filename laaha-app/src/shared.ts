// Shared between the app and the server.

export const MODES = [
  { id: 'online', label: 'Online', hint: 'On social media, in messages, on a website or in an app' },
  { id: 'in-person', label: 'In person', hint: 'In the street, at school or work, at home, in the community' },
] as const;
export type Mode = (typeof MODES)[number]['id'];

export const ONLINE_CATEGORIES = [
  'Fabricated story',
  'Manipulated image or video',
  'Harassment or pile-on',
  'False claim to discredit',
  'Doxxing or exposure',
  'Other',
] as const;

export const IN_PERSON_CATEGORIES = [
  'Verbal harassment or insults',
  'Rumours or lies spread about her',
  'Threats or intimidation',
  'Being followed or watched',
  'Physical or sexual violence',
  'Other',
] as const;

export const CATEGORIES = [...ONLINE_CATEGORIES, ...IN_PERSON_CATEGORIES.filter((c) => c !== 'Other')] as const;

export function categoriesFor(mode: Mode): readonly Category[] {
  return mode === 'online' ? ONLINE_CATEGORIES : IN_PERSON_CATEGORIES;
}

/** Categories where the person may be in physical danger. */
export const DANGER_CATEGORIES: readonly Category[] = ['Threats or intimidation', 'Being followed or watched', 'Physical or sexual violence'];

export const VICTIMS = [
  { id: 'me', label: 'Me', hint: 'It is about me' },
  { id: 'someone-i-know', label: 'Someone I know', hint: 'A friend, family member or colleague' },
  { id: 'public-figure', label: 'A public woman', hint: 'Journalist, activist, politician, artist…' },
  { id: 'group', label: 'Women in general', hint: 'A group, a community, or women as a whole' },
  { id: 'not-say', label: "I'd rather not say", hint: '' },
] as const;

export const CATEGORY_HINTS: Record<(typeof CATEGORIES)[number], string> = {
  'Fabricated story': 'A false story or rumour',
  'Manipulated image or video': 'Edited photo, deepfake, fake screenshot',
  'Harassment or pile-on': 'Insults, threats, many people attacking',
  'False claim to discredit': 'Lies to damage reputation or work',
  'Doxxing or exposure': 'Address, phone or private photos shared',
  'Verbal harassment or insults': 'Comments, catcalling, humiliation',
  'Rumours or lies spread about her': 'Gossip or false stories told in the community',
  'Threats or intimidation': 'Someone threatened her or tried to scare her',
  'Being followed or watched': 'Followed, waited for, or watched',
  'Physical or sexual violence': 'Touched, hurt or attacked',
  Other: 'Something else',
};

export const PLACES = [
  'Street or public transport',
  'School or university',
  'Workplace',
  'Home or family',
  'Community or religious place',
  'Other',
] as const;
export type Place = (typeof PLACES)[number];

export const PLATFORMS = ['Instagram', 'Reddit', 'Facebook', 'TikTok', 'X', 'WhatsApp', 'Other'] as const;

export const STATUSES = ['pending', 'verified', 'rejected', 'needs more info'] as const;

export const SERVICES = ['Legal aid', 'Counselling', 'Shelter', 'Digital-safety clinic', 'Medical', 'Other'] as const;

export const MAX_IMAGES = 5;

export type Category = (typeof CATEGORIES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Status = (typeof STATUSES)[number];
export type Victim = (typeof VICTIMS)[number]['id'];

/** What the app sends when submitting a report. */
export interface ReportInput {
  id: string;
  mode?: Mode; // missing on reports from older app versions, which were all online
  victim: Victim;
  category: Category;
  platform?: Platform; // online reports
  place?: Place; // in-person reports
  area?: string; // in-person: city or neighbourhood, optional
  link?: string;
  description?: string;
  incidentDate?: string; // YYYY-MM-DD, approximate
  images: string[]; // data URLs, metadata already stripped
  consentResearch: boolean;
  consentPartners: boolean;
  contactEmail?: string;
  origin?: 'form' | 'fact-check';
}

export interface StoredReport extends Omit<ReportInput, 'contactEmail'> {
  createdAt: string;
  status: Status;
  tags: string[];
}

export interface Partner {
  id: string;
  name: string;
  services: string[];
  address: string; // or "Remote only"
  lat?: number;
  lng?: number;
  hours: string;
  languages: string[];
  phone?: string;
  email?: string;
  website?: string;
  demo?: boolean;
  translations?: Translations<Pick<Partner, 'name' | 'address' | 'hours'>>;
}

/** Translated text fields by language code ("uk", "pl"). Missing fields fall back to English. */
export type Translations<T> = Record<string, Partial<T>>;

export interface Guide {
  id: string;
  title: string;
  summary: string;
  body: string;
  translations?: Translations<Pick<Guide, 'title' | 'summary' | 'body'>>;
}

export interface Helpline {
  id: string;
  name: string;
  description: string;
  phone: string;
  hours: string;
  languages: string[];
  free?: boolean;
  demo?: boolean;
  translations?: Translations<Pick<Helpline, 'name' | 'description' | 'hours'>>;
}

/** Bump when the bundle shape changes so phones re-download it. */
export const BUNDLE_VERSION = 3;

export interface Bundle {
  version: number;
  partners: Partner[];
  guides: Guide[];
  helplines: Helpline[];
  updatedAt: string;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns an error message, or null if the report is valid. */
export function validateReport(r: Partial<ReportInput>): string | null {
  if (!r.id) return 'Missing report id';
  if (!r.victim || !VICTIMS.some((v) => v.id === r.victim)) return 'Choose who was targeted';
  const mode = r.mode ?? 'online';
  if (!MODES.some((m) => m.id === mode)) return 'Choose online or in person';
  if (!r.category || !categoriesFor(mode).includes(r.category)) return 'Choose what happened';
  const images = r.images ?? [];
  if (images.length > MAX_IMAGES) return `At most ${MAX_IMAGES} photos or screenshots`;
  if (mode === 'online') {
    if (!r.platform || !PLATFORMS.includes(r.platform)) return 'Choose where you saw it';
    if (!r.link?.trim() && !r.description?.trim() && images.length === 0)
      return 'Add at least a link, a screenshot or a description';
    if (r.link?.trim() && !isValidUrl(r.link.trim())) return 'The link must start with http:// or https://';
  } else {
    if (!r.place || !PLACES.includes(r.place)) return 'Choose where it happened';
    if (r.link?.trim()) return 'In-person reports do not take a link';
    if (!r.description?.trim() && images.length === 0) return 'Tell us in a few words what happened';
    if ((r.area?.length ?? 0) > 80) return 'Keep the area short, for example a city or neighbourhood';
  }
  return null;
}

export const VERDICTS = ['Likely false', 'Misleading', 'Unverified', 'Likely true'] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  image?: string; // data URL, user turns only
}

export interface FactCheckAnswer {
  verdict: Verdict;
  confidence: 'low' | 'medium' | 'high';
  text: string;
  sources: { title: string; url: string }[];
  demo?: boolean;
}
