import { useCallback, useEffect, useState } from 'react';
import { CATEGORIES, MODES, PLACES, PLATFORMS, STATUSES, VICTIMS, categoriesFor, type Status, type StoredReport } from '../shared';

const victimLabel = (id?: string) => VICTIMS.find((v) => v.id === id)?.label ?? 'Unknown';

type StaffReport = StoredReport & { contactEmail?: string };
interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byPlatform: Record<string, number>;
  byStatus: Record<string, number>;
  byVictim: Record<string, number>;
  byMode: Record<string, number>;
  byPlace: Record<string, number>;
}

export default function Staff() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('staffPw') ?? '');
  const [authed, setAuthed] = useState(false);
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [category, setCategory] = useState('');
  const [victim, setVictim] = useState('');
  const [mode, setMode] = useState('');

  const api = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(`/api/staff${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', 'x-staff-password': password, ...init?.headers },
      }),
    [password],
  );

  const refresh = useCallback(async () => {
    const [r, s] = await Promise.all([api('/reports'), api('/stats')]);
    if (r.status === 401) {
      setAuthed(false);
      return setError('Wrong password');
    }
    setError(null);
    setAuthed(true);
    sessionStorage.setItem('staffPw', password);
    setReports(await r.json());
    setStats(await s.json());
  }, [api, password]);

  useEffect(() => {
    document.title = 'Laaha · Staff';
    if (password) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(id: string, body: Partial<StoredReport>) {
    await api(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    await refresh();
  }

  async function exportCsv() {
    const res = await api('/export.csv');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `laaha-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!authed) {
    return (
      <form
        className="staff login"
        onSubmit={(e) => {
          e.preventDefault();
          void refresh();
        }}
      >
        <h1>Laaha staff</h1>
        <input type="password" placeholder="Staff password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="error">{error}</p>}
        <button className="button">Sign in</button>
        <small className="muted">Demo password: laaha-demo</small>
      </form>
    );
  }

  const shown = reports.filter(
    (r) => (!status || r.status === status) && (!mode || (r.mode ?? 'online') === mode) && (!platform || r.platform === platform || r.place === platform) && (!category || r.category === category) && (!victim || r.victim === victim),
  );

  return (
    <div className="staff">
      <header className="row between">
        <h1>Moderation</h1>
        <div className="row">
          <button className="button ghost" onClick={refresh}>
            Refresh
          </button>
          <button className="button" onClick={exportCsv} title="Verified reports with research consent, no identifying fields">
            Export anonymised CSV
          </button>
        </div>
      </header>

      {stats && (
        <section className="stats">
          <Tile label="Total" value={stats.total} />
          <Tile label="Pending" value={stats.byStatus.pending ?? 0} />
          <Tile label="Verified" value={stats.byStatus.verified ?? 0} />
          <Breakdown title="By category" data={stats.byCategory} />
          <Breakdown
            title="Online or in person"
            data={Object.fromEntries(Object.entries(stats.byMode).map(([k, v]) => [MODES.find((m) => m.id === k)?.label ?? k, v]))}
          />
          <Breakdown title="Online: by platform" data={stats.byPlatform} />
          <Breakdown title="In person: by place" data={stats.byPlace} />
          <Breakdown
            title="Who was targeted"
            data={Object.fromEntries(Object.entries(stats.byVictim).map(([k, v]) => [victimLabel(k), v]))}
          />
        </section>
      )}

      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">Online and in person</option>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">All platforms and places</option>
          <optgroup label="Online">
            {PLATFORMS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </optgroup>
          <optgroup label="In person">
            {PLACES.filter((p) => p !== 'Other').map((s) => (
              <option key={s}>{s}</option>
            ))}
          </optgroup>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={victim} onChange={(e) => setVictim(e.target.value)}>
          <option value="">Anyone targeted</option>
          {VICTIMS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        <span className="muted">{shown.length} report(s)</span>
      </div>

      {shown.length === 0 && <p className="muted">No reports yet. Submit one from the app at /report.</p>}
      {shown.map((r) => (
        <ReportRow key={r.id} r={r} onPatch={(body) => patch(r.id, body)} />
      ))}
    </div>
  );
}

function ReportRow({ r, onPatch }: { r: StaffReport; onPatch: (b: Partial<StoredReport>) => void }) {
  const [tags, setTags] = useState(r.tags.join(', '));
  const [revealed, setRevealed] = useState<number[]>([]);

  return (
    <article className={`card report status-${r.status.replace(/ /g, '-')}`}>
      <div className="row between">
        <strong>
          {r.id.slice(0, 8).toUpperCase()} · {r.mode === 'in-person' ? 'In person' : 'Online'} ·{' '}
          {r.platform ?? [r.place, r.area].filter(Boolean).join(', ')} · Target: {victimLabel(r.victim)}
          {r.origin === 'fact-check' && <span className="tag">from fact-check</span>}
        </strong>
        <span className="muted">{new Date(r.createdAt).toLocaleString()}</span>
      </div>
      <div className="row">
        <select value={r.status} onChange={(e) => onPatch({ status: e.target.value as Status })}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={r.category} onChange={(e) => onPatch({ category: e.target.value as StoredReport['category'] })}>
          {categoriesFor(r.mode ?? 'online').map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {r.link && (
        <a href={r.link} target="_blank" rel="noreferrer noopener">
          {r.link}
        </a>
      )}
      {r.description && <p className="pre">{r.description}</p>}
      {r.images.length > 0 && (
        <div className="thumbs">
          {r.images.map((src, i) => (
            <button key={i} onClick={() => setRevealed([...revealed, i])} title="Click to reveal">
              <img src={src} alt="" className={revealed.includes(i) ? '' : 'blurred'} />
            </button>
          ))}
        </div>
      )}
      <span className="muted">
        Incident: {r.incidentDate ?? 'unknown'} · Research consent: {r.consentResearch ? 'yes' : 'no'} · Partner sharing:{' '}
        {r.consentPartners ? 'yes' : 'no'}
        {r.contactEmail && ` · Contact: ${r.contactEmail}`}
      </span>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          onPatch({ tags: tags.split(',') });
        }}
      >
        <input placeholder="Tags, comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />
        <button className="button small ghost">Save tags</button>
      </form>
    </article>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="tile">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <div className="breakdown">
      <span className="muted">{title}</span>
      {Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => (
          <div key={k} className="bar">
            <span>{k}</span>
            <div style={{ width: `${(v / max) * 100}%` }} />
            <b>{v}</b>
          </div>
        ))}
      {Object.keys(data).length === 0 && <span className="muted">No data</span>}
    </div>
  );
}
