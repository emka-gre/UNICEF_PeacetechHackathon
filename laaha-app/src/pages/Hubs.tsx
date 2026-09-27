import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { SERVICES, type Partner } from '../shared';
import { useBundle } from '../lib/bundle';
import { useOnline } from '../lib/queue';
import { localize, useLang, useT } from '../i18n';

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
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState('');
  const [service, setService] = useState('');
  const [language, setLanguage] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const partners = useMemo(() => (bundle?.partners ?? []).map((p) => localize(p, lang)), [bundle, lang]);
  const languages = useMemo(() => [...new Set(partners.flatMap((p) => p.languages))].sort(), [partners]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = partners.filter(
      (p) =>
        (!needle || [p.name, p.address, ...p.services, ...p.services.map((s) => t.services[s] ?? '')].join(' ').toLowerCase().includes(needle)) &&
        (!service || p.services.includes(service)) &&
        (!language || p.languages.includes(language)),
    );
    if (me) {
      const d = (p: Partner) => (p.lat != null && p.lng != null ? distanceKm(me, [p.lat, p.lng]) : Infinity);
      list.sort((a, b) => d(a) - d(b));
    }
    return list;
  }, [partners, q, service, language, me, t]);

  // Location is asked for only on tap and never leaves the phone.
  function nearMe() {
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError(t.hubs.noLocation),
      { timeout: 10000 },
    );
  }

  if (!bundle) return <p className="stack">{error ?? t.common.loading}</p>;

  const mapped = results.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="stack">
      <h1>{t.hubs.title}</h1>
      <input type="search" placeholder={t.hubs.search} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row">
        <select value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">{t.hubs.allServices}</option>
          {SERVICES.map((s) => (
            <option key={s} value={s}>
              {t.services[s] ?? s}
            </option>
          ))}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">{t.hubs.allLanguages}</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {t.languageNames[l] ?? l}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <div className="segmented">
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            {t.hubs.list}
          </button>
          <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>
            {t.hubs.map}
          </button>
        </div>
        <button className="link" onClick={nearMe}>
          {t.hubs.nearMe}
        </button>
      </div>
      {locError && <p className="error">{locError}</p>}

      {view === 'map' && !online && <p className="muted">{t.hubs.mapOffline}</p>}
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
                {p.services.map((s) => t.services[s] ?? s).join(', ')}
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
          <p className="muted">{t.hubs.noResults}</p>
        ) : (
          results.map((p) => <PartnerCard key={p.id} p={p} me={me} />)
        ))}

      <small className="muted">{t.hubs.updated(new Date(bundle.updatedAt).toLocaleString(t.locale))}</small>
    </div>
  );
}

function PartnerCard({ p, me }: { p: Partner; me: [number, number] | null }) {
  const t = useT();
  const km = me && p.lat != null && p.lng != null ? distanceKm(me, [p.lat, p.lng]) : null;
  return (
    <article className="card">
      <strong>
        {p.name} {p.demo && <span className="tag">{t.common.demo}</span>}
      </strong>
      <span>{p.services.map((s) => t.services[s] ?? s).join(' · ')}</span>
      <span className="muted">
        {p.address}
        {km != null && ` · ${km.toFixed(1)} km`}
      </span>
      <span className="muted">
        {t.hubs.open} {p.hours}
      </span>
      <span className="muted">
        {t.hubs.languages} {p.languages.map((l) => t.languageNames[l] ?? l).join(', ')}
      </span>
      <div className="row">
        {p.phone && (
          <a className="button small" href={`tel:${p.phone}`}>
            {t.common.call}
          </a>
        )}
        {p.email && (
          <a className="button small ghost" href={`mailto:${p.email}`}>
            {t.hubs.email}
          </a>
        )}
        {p.website && (
          <a className="button small ghost" href={p.website} target="_blank" rel="noreferrer">
            {t.hubs.website}
          </a>
        )}
      </div>
    </article>
  );
}
