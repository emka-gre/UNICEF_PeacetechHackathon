import { Link } from 'react-router-dom';
import { useDiscreet } from '../lib/safety';
import { getQueue, useQueueLength } from '../lib/queue';
import { useState } from 'react';
import { load, save } from '../lib/storage';
import type { HistoryItem } from './Report';
import { SearchIcon } from '../icons';
import { useT } from '../i18n';

export default function Home() {
  const discreet = useDiscreet();
  const t = useT();
  useQueueLength(); // re-render when the queue changes
  const emergency = load('emergencyNumber', '112');
  const [history, setHistory] = useState(() => load<HistoryItem[]>('history', []));

  function forget(ref?: string) {
    const next = ref ? history.filter((h) => h.ref !== ref) : [];
    setHistory(next);
    save('history', next);
  }
  const waiting = new Set(getQueue().map((r) => r.id.slice(0, 8).toUpperCase()));
  const tiles = t.home.tiles;

  return (
    <div className="stack">
      <div className="prototype">{t.home.prototype}</div>

      {!discreet && (
        <a className="sos" href={`tel:${emergency}`}>
          <strong>{t.home.inDanger}</strong>
          <span>{t.common.callNumber(emergency)}</span>
        </a>
      )}
      {!discreet && (
        <Link className="sos sos-share" to="/sos">
          <strong>{t.common.sosShare}</strong>
          <span>SOS</span>
        </Link>
      )}

      <section className="hero">
        <h1>{discreet ? t.home.titleDiscreet : t.home.title}</h1>
        {!discreet && <p>{t.home.intro}</p>}
        <Link to="/report" className="button">
          {discreet ? t.home.reportDiscreet : t.home.report}
        </Link>
      </section>

      {!discreet && (
        <>
          <Link to="/hubs" className="help-band">
            <p>{t.home.helpBand}</p>
            <span className="button sun">{t.home.findServices}</span>
          </Link>
          <div className="search-band">
            <Link to="/check" className="search-pill">
              <SearchIcon /> {t.home.askPill}
            </Link>
          </div>
        </>
      )}

      <h2>{discreet ? t.home.browse : t.home.howCanWeHelp}</h2>
      <div className="tiles">
        <Link to="/report" className="tile-link pink" data-more={t.home.explore}>
          <strong>{discreet ? t.home.reportDiscreet : t.home.report}</strong>
          <span>{discreet ? tiles.reportSubDiscreet : tiles.reportSub}</span>
        </Link>
        <Link to="/check" className="tile-link sun" data-more={t.home.explore}>
          <strong>{discreet ? tiles.checkDiscreet : tiles.check}</strong>
          <span>{discreet ? tiles.checkSubDiscreet : tiles.checkSub}</span>
        </Link>
        <Link to="/hubs" className="tile-link sky" data-more={t.home.explore}>
          <strong>{discreet ? tiles.hubsDiscreet : tiles.hubs}</strong>
          <span>{discreet ? tiles.hubsSubDiscreet : tiles.hubsSub}</span>
        </Link>
        <Link to="/contacts" className="tile-link peach" data-more={t.home.explore}>
          <strong>{discreet ? tiles.contactsDiscreet : tiles.contacts}</strong>
          <span>{discreet ? tiles.contactsSubDiscreet : tiles.contactsSub}</span>
        </Link>
        <Link to="/guides" className="tile-link mint" data-more={t.home.explore}>
          <strong>{discreet ? tiles.guidesDiscreet : tiles.guides}</strong>
          <span>{tiles.guidesSub}</span>
        </Link>
        <Link to="/events" className="tile-link sky" data-more={t.home.explore}>
          <strong>{discreet ? tiles.eventsDiscreet : tiles.events}</strong>
          <span>{discreet ? tiles.eventsSubDiscreet : tiles.eventsSub}</span>
        </Link>
      </div>

      {history.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h2>{discreet ? t.home.recent : t.home.myReports}</h2>
            <button className="link" onClick={() => forget()}>
              {t.home.deleteAll}
            </button>
          </div>
          {history.slice(0, 5).map((h) => (
            <div key={h.ref} className="card row between">
              <span>
                <code>{h.ref}</code> {!discreet && (t.categories[h.category]?.label ?? h.category)}
              </span>
              <span className="muted">
                {waiting.has(h.ref) ? t.home.waitingToSend : t.home.sent} · {new Date(h.date).toLocaleDateString(t.locale)} ·{' '}
                <button className="link" onClick={() => forget(h.ref)}>
                  {t.common.delete}
                </button>
              </span>
            </div>
          ))}
        </section>
      )}
      {!discreet && (
        <footer className="site-footer">
          <span className="brand">Laaha</span>
          <p className="muted">{t.home.footer}</p>
        </footer>
      )}
    </div>
  );
}
