import { useState } from 'react';
import { COVERS, getCode, getCover, setCode, setCover, setDiscreet, useDiscreet, type Cover } from '../lib/safety';
import { load, save, wipeDevice } from '../lib/storage';

export default function Settings() {
  const discreet = useDiscreet();
  const [confirming, setConfirming] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [cover, pickCover] = useState<Cover>(getCover);
  const [code, editCode] = useState(getCode);
  const codeOk = code.trim() === '' || code.trim().length >= 4;
  const [emergency, setEmergency] = useState(() => load('emergencyNumber', '112'));

  async function wipe() {
    await wipeDevice();
    setDiscreet(false);
    setConfirming(false);
    setWiped(true);
  }

  return (
    <div className="stack">
      <h1>Settings</h1>

      <section className="card stack">
        <strong>Discreet mode</strong>
        <span className="muted">
          The app opens as an ordinary app that really works. Nothing about Laaha is shown until you type your secret code.
        </span>

        <span className="label">Look like</span>
        <div className="chips">
          {(Object.keys(COVERS) as Cover[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`chip small${cover === c ? ' on' : ''}`}
              onClick={() => {
                pickCover(c);
                setCover(c);
              }}
            >
              {COVERS[c].name}
            </button>
          ))}
        </div>

        <label>
          Secret code (optional, at least 4 letters or numbers)
          <input
            value={code}
            autoComplete="off"
            onChange={(e) => {
              editCode(e.target.value);
              const v = e.target.value.trim();
              if (v === '' || v.length >= 4) setCode(v);
            }}
          />
        </label>
        <span className="muted">
          {code.trim()
            ? `To open Laaha, ${COVERS[cover].hint}. Pick something you will remember but others won't guess. If you forget it, clear this site's data in your browser to get back in (this deletes everything saved).`
            : `No code: to open Laaha, press and hold the "${COVERS[cover].name}" title at the top for 2 seconds. A code is safer, because anyone who knows the trick can get in.`}
        </span>

        <label className="check">
          <input type="checkbox" checked={discreet} disabled={!discreet && !codeOk} onChange={(e) => setDiscreet(e.target.checked)} />
          <span>
            <strong>Turn on discreet mode</strong>
            <span className="muted">The app locks right away. "Lock" at the top, or leaving the app for a minute, locks it again.</span>
          </span>
        </label>
        <span className="muted">
          Turn this on <em>before</em> adding the app to your home screen. The home-screen icon can only change if you reinstall.
        </span>
      </section>

      <section className="card">
        <label>
          Local emergency number
          <input
            type="tel"
            value={emergency}
            onChange={(e) => {
              setEmergency(e.target.value);
              save('emergencyNumber', e.target.value.trim());
            }}
          />
        </label>
        <span className="muted">Used by the "In danger right now?" button on the home screen.</span>
      </section>

      <section className="card">
        <strong>Quick exit</strong>
        <span className="muted">
          Tap Exit at the top (or press Esc twice) to leave right away. The back button won't bring you back here. In discreet mode, the
          button says Lock and takes you back to the cover app.
        </span>
      </section>

      <section className="card">
        <strong>Delete data on this phone</strong>
        <span className="muted">Removes saved contacts, guides, settings, your report history and reports that haven't been sent yet.</span>
        {wiped && <p>Done. Nothing from this app is left on this phone.</p>}
        {!confirming ? (
          <button className="button danger" onClick={() => setConfirming(true)}>
            Delete data
          </button>
        ) : (
          <div className="row">
            <button className="button danger" onClick={wipe}>
              Yes, delete everything
            </button>
            <button className="button ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
