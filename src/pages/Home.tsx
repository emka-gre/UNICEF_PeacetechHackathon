import { Link } from 'react-router-dom';
import { useDiscreet } from '../lib/safety';
import { getQueue, useQueueLength } from '../lib/queue';
import { useState } from 'react';
import { load, save } from '../lib/storage';
import type { HistoryItem } from './Report';
import { SearchIcon } from '../icons';

export default function Home() {
  const discreet = useDiscreet();
  useQueueLength(); // re-render when the queue changes
  const emergency = load('emergencyNumber', '112');
  const [history, setHistory] = useState(() => load<HistoryItem[]>('history', []));

  function forget(ref?: string) {
    const next = ref ? history.filter((h) => h.ref !== ref) : [];
    setHistory(next);
    save('history', next);
  }
  const waiting = new Set(getQueue().map((r) => r.id.slice(0, 8).toUpperCase()));

  return (
    <div className="stack">
      <div className="prototype">Prototype · demo data only</div>

      {!discreet && (
        <a className="sos" href={`tel:${emergency}`}>
          <strong>In danger right now?</strong>
          <span>Call {emergency}</span>
        </a>
      )}
      {!discreet && (
        <Link className="sos sos-share" to="/sos">
          <strong>Send my location to someone I trust</strong>
          <span>SOS</span>
        </Link>
      )}

      <section className="hero">
        <h1>{discreet ? 'Your notes' : 'You are not alone.'}</h1>
        {!discreet && (
          <p>
            False stories, edited photos and online harassment are used to silence women. Report it, check it, and find people who can
            help. You can stay anonymous.
          </p>
        )}
        <Link to="/report" className="button">
          {discreet ? 'New entry' : 'Report harm'}
        </Link>
      </section>

      {!discreet && (
        <>
          <Link to="/hubs" className="help-band">
            <p>If you or someone you know needs help, find nearby services and learn how to reach them.</p>
            <span className="button sun">Find services</span>
          </Link>
          <div className="search-band">
            <Link to="/check" className="search-pill">
              <SearchIcon /> Saw something online? Ask if it's true…
            </Link>
          </div>
        </>
      )}

      <h2>{discreet ? 'Browse' : 'How can we help?'}</h2>
      <div className="tiles">
        <Link to="/report" className="tile-link pink">
          <strong>{discreet ? 'New entry' : 'Report harm'}</strong>
          <span>{discreet ? 'Write something down' : 'Takes 1 minute. Works offline.'}</span>
        </Link>
        <Link to="/check" className="tile-link sun">
          <strong>{discreet ? 'Ask' : 'Is it true?'}</strong>
          <span>{discreet ? 'Look something up' : 'Check a post, claim or photo with our assistant'}</span>
        </Link>
        <Link to="/hubs" className="tile-link sky">
          <strong>{discreet ? 'Places' : 'Find help near you'}</strong>
          <span>{discreet ? 'Saved places' : 'Legal aid, counselling, shelters, digital safety'}</span>
        </Link>
        <Link to="/contacts" className="tile-link peach">
          <strong>{discreet ? 'People' : 'Call for help'}</strong>
          <span>{discreet ? 'Saved numbers' : 'Helplines and people you trust'}</span>
        </Link>
        <Link to="/guides" className="tile-link mint">
          <strong>{discreet ? 'Reading' : 'Safety guides'}</strong>
          <span>Readable offline</span>
        </Link>
        <Link to="/events" className="tile-link sky">
          <strong>{discreet ? 'Calendar' : 'Events'}</strong>
          <span>{discreet ? 'Upcoming dates' : 'Global days and community events'}</span>
        </Link>
      </div>

      {history.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h2>{discreet ? 'Recent' : 'My reports'}</h2>
            <button className="link" onClick={() => forget()}>
              Delete all
            </button>
          </div>
          {history.slice(0, 5).map((h) => (
            <div key={h.ref} className="card row between">
              <span>
                <code>{h.ref}</code> {!discreet && h.category}
              </span>
              <span className="muted">
                {waiting.has(h.ref) ? 'Waiting to send' : 'Sent'} · {new Date(h.date).toLocaleDateString()} ·{' '}
                <button className="link" onClick={() => forget(h.ref)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
        </section>
      )}
      {!discreet && (
        <footer className="site-footer">
          <span className="brand">Laaha</span>
          <p className="muted">A safe space to report online harm, check what's true, and find help. Prototype, demo data only.</p>
        </footer>
      )}
    </div>
  );
}
