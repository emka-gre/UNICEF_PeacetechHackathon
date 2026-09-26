import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { SERVICES, type Partner } from '../shared';
import { useBundle } from '../lib/bundle';
import { useOnline } from '../lib/queue';

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export default function Hubs() {
  const { bundle, error } = useBundle();
  const online = useOnline();
  const [q, setQ] = useState('');
  const [service, setService] = useState('');
  const [language, setLanguage] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const partners = bundle?.partners ?? [];
  const languages = useMemo(() => [...new Set(partners.flatMap((p) => p.languages))].sort(), [partners]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = partners.filter(
      (p) =>
        (!needle || [p.name, p.address, ...p.services].join(' ').toLowerCase().includes(needle)) &&
        (!service || p.services.includes(service)) &&
        (!language || p.languages.includes(language)),
    );
    if (me) {
      const d = (p: Partner) => (p.lat != null && p.lng != null ? distanceKm(me, [p.lat, p.lng]) : Infinity);
      list.sort((a, b) => d(a) - d(b));
    }
    return list;
  }, [partners, q, service, language, me]);

  // Location is asked for only on tap and never leaves the phone.
  function nearMe() {
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError('Location not available. You can still search by name or city.'),
      { timeout: 10000 },
    );
  }

  if (!bundle) return <p className="stack">{error ?? 'Loading…'}</p>;

  const mapped = results.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="stack">
      <h1>Find help</h1>
      <input type="search" placeholder="Search by name, city or service" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row">
        <select value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">All services</option>
          {SERVICES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className="row">
        <div className="segmented">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            List
          </button>
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>
            Map
          </button>
        </div>
        <button className="link" onClick={nearMe}>
          Near me
        </button>
      </div>
      {locError && <p className="error">{locError}</p>}

      {view === 'map' && !online && <p className="muted">The map needs an internet connection. Here is the list instead.</p>}
      {view === 'map' && online && (
        <MapContainer
          className="map"
          center={me ?? (mapped[0] ? [mapped[0].lat!, mapped[0].lng!] : [31.95, 35.91])}
          zoom={11}
          scrollWheelZoom={false}
        >
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {mapped.map((p) => (
            <CircleMarker key={p.id} center={[p.lat!, p.lng!]} radius={10} pathOptions={{ color: '#c94f1b', fillOpacity: 0.7 }}>
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.services.join(', ')}
                <br />
                {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
              </Popup>
            </CircleMarker>
          ))}
          {me && <CircleMarker center={me} radius={6} pathOptions={{ color: '#1d6fd1', fillOpacity: 1 }} />}
        </MapContainer>
      )}

      {(view === 'list' || !online) &&
        (results.length === 0 ? (
          <p className="muted">No results. Try clearing the filters.</p>
        ) : (
          results.map((p) => <PartnerCard key={p.id} p={p} me={me} />)
        ))}

      <small className="muted">Directory updated {new Date(bundle.updatedAt).toLocaleString()}</small>
    </div>
  );
}

function PartnerCard({ p, me }: { p: Partner; me: [number, number] | null }) {
  const km = me && p.lat != null && p.lng != null ? distanceKm(me, [p.lat, p.lng]) : null;
  return (
    <article className="card">
      <strong>
        {p.name} {p.demo && <span className="tag">Demo</span>}
      </strong>
      <span>{p.services.join(' · ')}</span>
      <span className="muted">
        {p.address}
        {km != null && ` · ${km.toFixed(1)} km`}
      </span>
      <span className="muted">Open: {p.hours}</span>
      <span className="muted">Languages: {p.languages.join(', ')}</span>
      <div className="row">
        {p.phone && (
          <a className="button small" href={`tel:${p.phone}`}>
            Call
          </a>
        )}
        {p.email && (
          <a className="button small ghost" href={`mailto:${p.email}`}>
            Email
          </a>
        )}
        {p.website && (
          <a className="button small ghost" href={p.website} target="_blank" rel="noreferrer">
            Website
          </a>
        )}
      </div>
    </article>
  );
}
