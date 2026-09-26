import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useOnline, useQueueLength } from './lib/queue';
import { COVERS, getCover, quickExit, setDiscreet, useDiscreet, useQuickExitShortcut, useUnlocked } from './lib/safety';
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

export default function App() {
  const discreet = useDiscreet();
  const online = useOnline();
  const queued = useQueueLength();
  const unlocked = useUnlocked();
  const staff = useLocation().pathname.startsWith('/staff');
  useQuickExitShortcut();

  if (staff) return <Staff />;
  // In discreet mode the app opens as a working cover app; the secret code opens the real one.
  if (discreet && !unlocked) return <Cover />;

  return (
    <div className="app">
      <header className="top">
        <NavLink to="/" className="brand">
          {discreet ? COVERS[getCover()].name : 'Laaha'}
        </NavLink>
        <div className="row">
          {discreet ? (
            // Looks like an ordinary "share location" icon so it doesn't give the app away.
            <NavLink to="/sos" className="gear" aria-label="Share location">
              <PinIcon />
            </NavLink>
          ) : (
            <NavLink to="/sos" className="sos-button" aria-label="SOS: send my location">
              SOS
            </NavLink>
          )}
          <NavLink to="/settings" className="gear" aria-label="Settings">
            <GearIcon />
          </NavLink>
          <button className="exit" onClick={quickExit} title={discreet ? 'Lock (or press Esc twice)' : 'Leave now (or press Esc twice)'}>
            {discreet ? 'Lock' : 'Exit'}
          </button>
        </div>
        {/* Inside the sticky header so it can never scroll out of sight. */}
        {discreet && (
          <div className="banner discreet-bar">
            <span>Opens as “{COVERS[getCover()].name}”</span>
            <button className="link" onClick={() => setDiscreet(false)}>
              Turn off
            </button>
          </div>
        )}
      </header>

      {!online && <div className="banner offline">You are offline. Reports are saved on this phone and sent later.</div>}
      {queued > 0 && online && <div className="banner">Sending {queued} saved report(s)…</div>}
      {queued > 0 && !online && <div className="banner">{queued} report(s) waiting to send</div>}

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
          Home
        </NavLink>
        <NavLink to="/report">
          <ReportIcon />
          {discreet ? 'New' : 'Report'}
        </NavLink>
        <NavLink to="/check">
          <SearchIcon />
          {discreet ? 'Ask' : 'Is it true?'}
        </NavLink>
        <NavLink to="/hubs">
          <PinIcon />
          {discreet ? 'Places' : 'Find help'}
        </NavLink>
        <NavLink to="/contacts">
          <PhoneIcon />
          {discreet ? 'People' : 'Call'}
        </NavLink>
      </nav>
    </div>
  );
}
