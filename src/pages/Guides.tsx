import { useState } from 'react';
import { useBundle } from '../lib/bundle';
import { load, save } from '../lib/storage';
import { localize, useLang, useT } from '../i18n';

export default function Guides() {
  const { bundle, error } = useBundle();
  const t = useT();
  const lang = useLang();
  const [saved, setSaved] = useState<string[]>(() => load('savedGuides', []));
  const [open, setOpen] = useState<string | null>(null);

  function toggle(id: string) {
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    setSaved(next);
    save('savedGuides', next);
  }

  if (!bundle) return <p className="stack">{error ?? t.common.loading}</p>;

  const guides = bundle.guides.map((g) => localize(g, lang)).sort((a, b) => Number(saved.includes(b.id)) - Number(saved.includes(a.id)));

  return (
    <div className="stack">
      <h1>{t.guides.title}</h1>
      <p className="muted">{t.guides.intro}</p>
      {guides.map((g) => (
        <article key={g.id} className="card">
          <button className="link title" onClick={() => setOpen(open === g.id ? null : g.id)}>
            {g.title}
          </button>
          <span className="muted">{g.summary}</span>
          {open === g.id && <p className="guide-body">{g.body}</p>}
          <button className="link" onClick={() => toggle(g.id)}>
            {saved.includes(g.id) ? t.guides.saved : t.guides.save}
          </button>
        </article>
      ))}
    </div>
  );
}
