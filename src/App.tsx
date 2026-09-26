import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useOnline, useQueueLength } from './lib/queue';
import { getCover, quickExit, setDiscreet, useDiscreet, useQuickExitShortcut, useUnlocked } from './lib/safety';
import Cover from './pages/Cover';
import Home from './pages/Home';
import Report from './pages/Report';
import Check from './pages/Check';
import Hubs from './pages/Hubs';
import Guides from './pages/Guides';
import Events from './pages/Events';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import Sos from './pages/Sos';
import Staff from './pages/Staff';
import './features.css';
import { GearIcon, HomeIcon, PhoneIcon, PinIcon, ReportIcon, SearchIcon } from './icons';
import { useT } from './i18n';

export default function App() {
  const discreet = useDiscreet();
  const online = useOnline();
  const queued = useQueueLength();
  const unlocked = useUnlocked();
  const t = useT();
  const staff = useLocation().pathname.startsWith('/staff');
  useQuickExitShortcut();

  if (staff) return <Staff />;
  // In discreet mode the app opens as a working cover app; the secret code opens the real one.
  if (discreet && !unlocked) return <Cover />;

  return (
    <div className="app">
      <header className="top">
        <NavLink to="/" className="brand">
          {discreet ? t.covers[getCover()].name : 'Laaha'}
        </NavLink>
        <div className="row">
          {discreet ? (
            // Looks like an ordinary "share location" icon so it doesn't give the app away.
            <NavLink to="/sos" className="gear" aria-label={t.app.shareLocation}>
              <PinIcon />
            </NavLink>
          ) : (
            <NavLink to="/sos" className="sos-button" aria-label={t.app.sosAria}>
              SOS
            </NavLink>
          )}
          <NavLink to="/settings" className="gear" aria-label={t.common.settings}>
            <GearIcon />
          </NavLink>
          <button className="exit" onClick={quickExit} title={discreet ? t.app.lockTitle : t.app.exitTitle}>
            {discreet ? t.app.lock : t.app.exit}
          </button>
        </div>
        {/* Inside the sticky header so it can never scroll out of sight. */}
        {discreet && (
          <div className="banner discreet-bar">
            <span>{t.app.opensAs(t.covers[getCover()].name)}</span>
            <button className="link" onClick={() => setDiscreet(false)}>
              {t.app.turnOff}
            </button>
          </div>
        )}
      </header>

      {!online && <div className="banner offline">{t.app.offline}</div>}
      {queued > 0 && online && <div className="banner">{t.app.sending(queued)}</div>}
      {queued > 0 && !online && <div className="banner">{t.app.waiting(queued)}</div>}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report />} />
          <Route path="/check" element={<Check />} />
          <Route path="/hubs" element={<Hubs />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/events" element={<Events />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sos" element={<Sos />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <nav className="tabs">
        <NavLink to="/" end>
          <HomeIcon />
          {t.app.tabs.home}
        </NavLink>
        <NavLink to="/report">
          <ReportIcon />
          {discreet ? t.app.tabs.reportDiscreet : t.app.tabs.report}
        </NavLink>
        <NavLink to="/check">
          <SearchIcon />
          {discreet ? t.app.tabs.checkDiscreet : t.app.tabs.check}
        </NavLink>
        <NavLink to="/hubs">
          <PinIcon />
          {discreet ? t.app.tabs.hubsDiscreet : t.app.tabs.hubs}
        </NavLink>
        <NavLink to="/contacts">
          <PhoneIcon />
          {discreet ? t.app.tabs.contactsDiscreet : t.app.tabs.contacts}
        </NavLink>
      </nav>
    </div>
  );
}
