import { useState } from 'react';
import { COVERS, getCode, getCover, setCode, setCover, setDiscreet, useDiscreet, type Cover } from '../lib/safety';
import { load, save, wipeDevice } from '../lib/storage';
import { LANGS, setLang, useLang, useT, type Lang } from '../i18n';

export default function Settings() {
  const discreet = useDiscreet();
  const t = useT();
  const lang = useLang();
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
      <h1>{t.settings.title}</h1>

      <section className="card stack">
        {/* Each language is named in its own language, so people can find theirs whatever is showing. */}
        <strong>{t.settings.language}</strong>
        <div className="chips">
          {(Object.keys(LANGS) as Lang[]).map((l) => (
            <button key={l} type="button" lang={l} className={`chip small${lang === l ? ' on' : ''}`} onClick={() => setLang(l)}>
              {LANGS[l].langName}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <strong>{t.settings.discreet}</strong>
        <span className="muted">{t.settings.discreetIntro}</span>

        <span className="label">{t.settings.lookLike}</span>
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
              {t.covers[c].name}
            </button>
          ))}
        </div>

        <label>
          {t.settings.code}
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
        <span className="muted">{code.trim() ? t.settings.codeSet(t.covers[cover].hint) : t.settings.noCode(t.covers[cover].name)}</span>

        <label className="check">
          <input type="checkbox" checked={discreet} disabled={!discreet && !codeOk} onChange={(e) => setDiscreet(e.target.checked)} />
          <span>
            <strong>{t.settings.turnOn}</strong>
            <span className="muted">{t.settings.turnOnHint}</span>
          </span>
        </label>
        <span className="muted">{t.settings.beforeInstall}</span>
      </section>

      <section className="card">
        <label>
          {t.settings.emergency}
          <input
            type="tel"
            value={emergency}
            onChange={(e) => {
              setEmergency(e.target.value);
              save('emergencyNumber', e.target.value.trim());
            }}
          />
        </label>
        <span className="muted">{t.settings.emergencyHint}</span>
      </section>

      <section className="card">
        <strong>{t.settings.quickExit}</strong>
        <span className="muted">{t.settings.quickExitHint}</span>
      </section>

      <section className="card">
        <strong>{t.settings.deleteData}</strong>
        <span className="muted">{t.settings.deleteDataHint}</span>
        {wiped && <p>{t.settings.deleted}</p>}
        {!confirming ? (
          <button className="button danger" onClick={() => setConfirming(true)}>
            {t.settings.deleteButton}
          </button>
        ) : (
          <div className="row">
            <button className="button danger" onClick={wipe}>
              {t.settings.confirmDelete}
            </button>
            <button className="button ghost" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
