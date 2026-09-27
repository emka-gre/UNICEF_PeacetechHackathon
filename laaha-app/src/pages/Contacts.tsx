import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBundle } from '../lib/bundle';
import { useDiscreet } from '../lib/safety';
import { load, save } from '../lib/storage';
import { PhoneIcon } from '../icons';
import { localize, useLang, useT } from '../i18n';

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
  const t = useT();
  const lang = useLang();
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
      <h1>{discreet ? t.contacts.titleDiscreet : t.contacts.title}</h1>
      <p className="muted">{t.contacts.intro}</p>

      {!discreet && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>{t.common.emergencyServices}</strong>
            <span>{t.common.inDangerNow}</span>
          </div>
          <span className="call-button">
            <PhoneIcon /> {emergency}
          </span>
        </a>
      )}
      {!discreet && (
        <Link className="sos sos-share" to="/sos">
          <strong>{t.common.sosShare}</strong>
          <span>SOS</span>
        </Link>
      )}

      <h2>{discreet ? t.contacts.helplinesDiscreet : t.contacts.helplines}</h2>
      {!bundle && <p className="muted">{t.contacts.connectOnce}</p>}
      {bundle?.helplines.map((raw) => localize(raw, lang)).map((h) => (
        <article key={h.id} className="card helpline">
          <div>
            <strong>
              {h.name} {h.demo && <span className="tag">{t.common.demo}</span>}
            </strong>
            {!discreet && <span>{h.description}</span>}
            <span className="muted">
              {h.hours} · {h.languages.map((l) => t.languageNames[l] ?? l).join(', ')}
              {h.free && ` · ${t.contacts.freeCall}`}
            </span>
          </div>
          <a className="call-button" href={`tel:${h.phone}`} aria-label={t.common.callNumber(h.name)}>
            <PhoneIcon /> {t.common.call}
          </a>
        </article>
      ))}
      {!discreet && (
        <Link to="/hubs" className="link">
          {t.contacts.seeAll}
        </Link>
      )}

      <h2>{discreet ? t.contacts.trustedDiscreet : t.contacts.trusted}</h2>
      <p className="muted">{t.contacts.trustedIntro}</p>
      {contacts.map((c, i) => (
        <div key={i} className="card helpline trusted">
          <div>
            <strong>{c.name}</strong>
            <span className="muted">{c.phone}</span>
          </div>
          <div className="row">
            <a className="call-button" href={`tel:${c.phone}`} aria-label={t.common.callNumber(c.name)}>
              <PhoneIcon /> {t.common.call}
            </a>
            <button className="link" onClick={() => update(contacts.filter((_, j) => j !== i))}>
              {t.contacts.remove}
            </button>
          </div>
        </div>
      ))}

      {contacts.length >= MAX ? (
        <p className="muted">{t.contacts.max(MAX)}</p>
      ) : adding ? (
        <form className="card stack" onSubmit={add}>
          <label>
            {t.contacts.name}
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            {t.contacts.phone}
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="row">
            <button className="button">{t.common.save}</button>
            <button type="button" className="button ghost" onClick={() => setAdding(false)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button className="button ghost" onClick={() => setAdding(true)}>
          {t.contacts.add}
        </button>
      )}
    </div>
  );
}
