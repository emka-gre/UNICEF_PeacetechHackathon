import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBundle } from '../lib/bundle';
import { useDiscreet } from '../lib/safety';
import { load, save } from '../lib/storage';
import { PhoneIcon } from '../icons';

interface Contact {
  name: string;
  phone: string;
}

const MAX = 5;

// Helplines come from the directory (cached for offline use).
// Trusted people are stored only on this phone and never sent to the server.
export default function Contacts() {
  const discreet = useDiscreet();
  const { bundle } = useBundle();
  const emergency = load('emergencyNumber', '112');
  const [contacts, setContacts] = useState<Contact[]>(() => load('contacts', []));
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function update(next: Contact[]) {
    setContacts(next);
    save('contacts', next);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || contacts.length >= MAX) return;
    update([...contacts, { name: name.trim(), phone: phone.trim() }]);
    setName('');
    setPhone('');
    setAdding(false);
  }

  return (
    <div className="stack">
      <h1>{discreet ? 'People' : 'Call for help'}</h1>
      <p className="muted">Calls work without internet.</p>

      {!discreet && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>Emergency services</strong>
            <span>If you are in danger right now</span>
          </div>
          <span className="call-button">
            <PhoneIcon /> {emergency}
          </span>
        </a>
      )}
      {!discreet && (
        <Link className="sos sos-share" to="/sos">
          <strong>Send my location to someone I trust</strong>
          <span>SOS</span>
        </Link>
      )}

      <h2>{discreet ? 'Numbers' : 'Helplines'}</h2>
      {!bundle && <p className="muted">Connect to the internet once to download the helplines.</p>}
      {bundle?.helplines.map((h) => (
        <article key={h.id} className="card helpline">
          <div>
            <strong>
              {h.name} {h.demo && <span className="tag">Demo</span>}
            </strong>
            {!discreet && <span>{h.description}</span>}
            <span className="muted">
              {h.hours} · {h.languages.join(', ')}
              {h.free && ' · Free call'}
            </span>
          </div>
          <a className="call-button" href={`tel:${h.phone}`} aria-label={`Call ${h.name}`}>
            <PhoneIcon /> Call
          </a>
        </article>
      ))}
      {!discreet && (
        <Link to="/hubs" className="link">
          See all organisations that can help
        </Link>
      )}

      <h2>{discreet ? 'Favourites' : 'People I trust'}</h2>
      <p className="muted">A friend or family member you can call quickly. Saved only on this phone.</p>
      {contacts.map((c, i) => (
        <div key={i} className="card helpline trusted">
          <div>
            <strong>{c.name}</strong>
            <span className="muted">{c.phone}</span>
          </div>
          <div className="row">
            <a className="call-button" href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
              <PhoneIcon /> Call
            </a>
            <button className="link" onClick={() => update(contacts.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {contacts.length >= MAX ? (
        <p className="muted">You can save up to {MAX} people.</p>
      ) : adding ? (
        <form className="card stack" onSubmit={add}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            Phone number
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="row">
            <button className="button">Save</button>
            <button type="button" className="button ghost" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="button ghost" onClick={() => setAdding(true)}>
          Add a person
        </button>
      )}
    </div>
  );
}
