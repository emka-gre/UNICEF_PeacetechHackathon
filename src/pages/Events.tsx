import { useState } from 'react';
import { useDiscreet } from '../lib/safety';

type Kind = 'global' | 'community';

interface Event {
  id: string;
  title: string;
  /** Shown in discreet mode, so the screen never says "violence" or "harm". */
  discreetTitle: string;
  kind: Kind;
  start: string; // YYYY-MM-DD
  end?: string;
  where: string;
  about: string;
  link?: string;
  demo?: boolean;
}

// Global days are real UN / UNICEF observances. Community events are demo data.
const EVENTS: Event[] = [
  {
    id: 'girl-child-2026',
    title: 'International Day of the Girl Child',
    discreetTitle: 'Day of the Girl',
    kind: 'global',
    start: '2026-10-11',
    where: 'Worldwide',
    about: "A UN day for girls' rights and the challenges girls face, including online.",
    link: 'https://www.un.org/en/observances/girl-child-day',
  },
  {
    id: 'demo-edited-photos',
    title: 'Online workshop: spotting edited photos',
    discreetTitle: 'Online workshop: photos',
    kind: 'community',
    start: '2026-10-22',
    where: 'Online',
    about: 'One hour, in a small group. Learn quick checks for fake and edited images before you share them.',
    demo: true,
  },
  {
    id: 'world-childrens-day-2026',
    title: "World Children's Day",
    discreetTitle: "World Children's Day",
    kind: 'global',
    start: '2026-11-20',
    where: 'Worldwide',
    about: "UNICEF's day of action for children, by children.",
    link: 'https://www.unicef.org/world-childrens-day',
  },
  {
    id: 'evaw-2026',
    title: 'International Day for the Elimination of Violence against Women',
    discreetTitle: 'International day (25 Nov)',
    kind: 'global',
    start: '2026-11-25',
    where: 'Worldwide',
    about: 'A UN day to end violence against women and girls, online and offline.',
    link: 'https://www.un.org/en/observances/ending-violence-against-women-day',
  },
  {
    id: '16-days-2026',
    title: '16 Days of Activism against Gender-Based Violence',
    discreetTitle: '16 Days campaign',
    kind: 'global',
    start: '2026-11-25',
    end: '2026-12-10',
    where: 'Worldwide',
    about: 'A yearly campaign from 25 November to Human Rights Day on 10 December.',
    link: 'https://www.unwomen.org/en/what-we-do/ending-violence-against-women/unite/16-days-of-activism',
  },
  {
    id: 'demo-safety-circle',
    title: 'Community circle: staying safe online',
    discreetTitle: 'Community circle',
    kind: 'community',
    start: '2026-12-03',
    where: 'Partner women’s centre',
    about: 'An informal, women-only meeting with a digital safety trainer. Tea provided.',
    demo: true,
  },
  {
    id: 'safer-internet-2027',
    title: 'Safer Internet Day',
    discreetTitle: 'Safer Internet Day',
    kind: 'global',
    start: '2027-02-09',
    where: 'Worldwide',
    about: 'A global day for a safer and better internet for everyone.',
    link: 'https://www.saferinternetday.org',
  },
  {
    id: 'womens-day-2027',
    title: "International Women's Day",
    discreetTitle: "International Women's Day",
    kind: 'global',
    start: '2027-03-08',
    where: 'Worldwide',
    about: "A UN day celebrating women's achievements and calling for equality.",
    link: 'https://www.un.org/en/observances/womens-day',
  },
];

const FILTERS: { id: 'all' | Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'global', label: 'Global days' },
  { id: 'community', label: 'Community' },
];

function parse(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function range(e: Event) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = parse(e.start).toLocaleDateString(undefined, opts);
  return e.end ? `${start} – ${parse(e.end).toLocaleDateString(undefined, opts)}` : start;
}

/** Builds the .ics on the phone, so adding to a calendar needs no internet and tells no server. */
function addToCalendar(e: Event, title: string) {
  const day = (s: string) => s.replaceAll('-', '');
  const end = parse(e.end ?? e.start);
  end.setDate(end.getDate() + 1); // all-day events end the next day (exclusive)
  const endStr = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Laaha//Events//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@laaha`,
    `DTSTART;VALUE=DATE:${day(e.start)}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${title}`,
    `LOCATION:${e.where}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${e.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); // revoking at once cancels the download in Safari
}

export default function Events() {
  const discreet = useDiscreet();
  const [filter, setFilter] = useState<'all' | Kind>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = EVENTS.filter((e) => parse(e.end ?? e.start) >= today)
    .filter((e) => filter === 'all' || e.kind === filter)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="stack">
      <h1>{discreet ? 'Calendar' : 'Events'}</h1>
      <p className="muted">
        {discreet ? 'Upcoming dates.' : 'Global days for women and girls, and events near you. This page works offline.'}
      </p>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip small ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {upcoming.map((e) => {
        const start = parse(e.start);
        const title = discreet ? e.discreetTitle : e.title;
        return (
          <article key={e.id} className={`card event ${e.kind}`}>
            <div className="event-date" aria-hidden="true">
              <span>{start.toLocaleDateString(undefined, { month: 'short' })}</span>
              <strong>{start.getDate()}</strong>
            </div>
            <div className="event-body">
              <span className="event-kind">
                {e.kind === 'global' ? 'Global day' : 'Community'} {e.demo && <span className="tag">Demo</span>}
              </span>
              <strong>{title}</strong>
              <span className="muted">
                {range(e)} · {e.where}
              </span>
              {!discreet && <p>{e.about}</p>}
              <div className="row">
                <button className="button small ghost" onClick={() => addToCalendar(e, title)}>
                  Add to calendar
                </button>
                {e.link && !discreet && (
                  <a className="link" href={e.link} target="_blank" rel="noreferrer">
                    Learn more
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {upcoming.length === 0 && <p className="muted">No upcoming events. Try another filter.</p>}
    </div>
  );
}
