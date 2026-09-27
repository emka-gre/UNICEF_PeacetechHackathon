import { useState } from 'react';
import { useDiscreet } from '../lib/safety';
import { useT, type Messages } from '../i18n';

type Kind = 'global' | 'community';

type EventId = keyof Messages['events']['items'];

interface Event {
  id: EventId;
  kind: Kind;
  start: string; // YYYY-MM-DD
  end?: string;
  link?: string;
  demo?: boolean;
}

// Titles and descriptions are in i18n (events.items), including a discreet title for each,
// so the screen never says "violence" or "harm" in discreet mode.
// Global days are real UN / UNICEF observances. Community events are demo data.
const EVENTS: Event[] = [
  { id: 'girl-child-2026', kind: 'global', start: '2026-10-11', link: 'https://www.un.org/en/observances/girl-child-day' },
  { id: 'demo-edited-photos', kind: 'community', start: '2026-10-22', demo: true },
  { id: 'world-childrens-day-2026', kind: 'global', start: '2026-11-20', link: 'https://www.unicef.org/world-childrens-day' },
  { id: 'evaw-2026', kind: 'global', start: '2026-11-25', link: 'https://www.un.org/en/observances/ending-violence-against-women-day' },
  {
    id: '16-days-2026',
    kind: 'global',
    start: '2026-11-25',
    end: '2026-12-10',
    link: 'https://www.unwomen.org/en/what-we-do/ending-violence-against-women/unite/16-days-of-activism',
  },
  { id: 'demo-safety-circle', kind: 'community', start: '2026-12-03', demo: true },
  { id: 'safer-internet-2027', kind: 'global', start: '2027-02-09', link: 'https://www.saferinternetday.org' },
  { id: 'womens-day-2027', kind: 'global', start: '2027-03-08', link: 'https://www.un.org/en/observances/womens-day' },
];

const FILTERS = ['all', 'global', 'community'] as const;

function parse(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function range(e: Event, locale: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const start = parse(e.start).toLocaleDateString(locale, opts);
  return e.end ? `${start} – ${parse(e.end).toLocaleDateString(locale, opts)}` : start;
}

/** Builds the .ics on the phone, so adding to a calendar needs no internet and tells no server. */
function addToCalendar(e: Event, title: string, where: string) {
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
    `LOCATION:${where}`,
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
  const t = useT();
  const [filter, setFilter] = useState<'all' | Kind>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = EVENTS.filter((e) => parse(e.end ?? e.start) >= today)
    .filter((e) => filter === 'all' || e.kind === filter)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="stack">
      <h1>{discreet ? t.events.titleDiscreet : t.events.title}</h1>
      <p className="muted">{discreet ? t.events.introDiscreet : t.events.intro}</p>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip small ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {{ all: t.events.all, global: t.events.globalDays, community: t.events.community }[f]}
          </button>
        ))}
      </div>

      {upcoming.map((e) => {
        const start = parse(e.start);
        const text = t.events.items[e.id];
        const title = discreet ? text.discreetTitle : text.title;
        return (
          <article key={e.id} className={`card event ${e.kind}`}>
            <div className="event-date" aria-hidden="true">
              <span>{start.toLocaleDateString(t.locale, { month: 'short' })}</span>
              <strong>{start.getDate()}</strong>
            </div>
            <div className="event-body">
              <span className="event-kind">
                {e.kind === 'global' ? t.events.globalDay : t.events.community} {e.demo && <span className="tag">{t.common.demo}</span>}
              </span>
              <strong>{title}</strong>
              <span className="muted">
                {range(e, t.locale)} · {text.where}
              </span>
              {!discreet && <p>{text.about}</p>}
              <div className="row">
                <button className="button small ghost" onClick={() => addToCalendar(e, title, text.where)}>
                  {t.events.addToCalendar}
                </button>
                {e.link && !discreet && (
                  <a className="link" href={e.link} target="_blank" rel="noreferrer">
                    {t.events.learnMore}
                  </a>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {upcoming.length === 0 && <p className="muted">{t.events.none}</p>}
    </div>
  );
}
