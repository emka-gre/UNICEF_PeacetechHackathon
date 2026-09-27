import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DANGER_CATEGORIES,
  IN_PERSON_CATEGORIES,
  MAX_IMAGES,
  MODES,
  ONLINE_CATEGORIES,
  PLACES,
  PLATFORMS,
  VICTIMS,
  isValidUrl,
  type Category,
  type Mode,
  type Place,
  type Platform,
  type ReportInput,
  type Victim,
} from '../shared';
import { stripAndShrink } from '../lib/image';
import { enqueue } from '../lib/queue';
import { load, save } from '../lib/storage';
import { CheckIcon } from '../icons';
import { useT, type Messages } from '../i18n';

const WHEN = [
  { id: 'today', daysAgo: 0 },
  { id: 'week', daysAgo: 3 },
  { id: 'month', daysAgo: 15 },
  { id: 'earlier', daysAgo: 60 },
  { id: 'unsure', daysAgo: null },
] as const;
type When = (typeof WHEN)[number]['id'];

// Online: one question per screen. In person: one screen to tell the story (steps 2 and 3 are skipped).
type StepName = keyof Messages['report']['steps'];
const ONLINE_STEPS: StepName[] = ['mode', 'who', 'what', 'where', 'details', 'send'];
const IN_PERSON_STEPS: StepName[] = ['mode', 'story', 'more', 'send'];
const IN_PERSON_INDEX: Record<number, number> = { 0: 0, 1: 1, 4: 2, 5: 3 };

export interface ReportPrefill {
  link?: string;
  description?: string;
}

export interface HistoryItem {
  ref: string;
  date: string;
  category: Category;
}

// Remounting the form with a new key gives a clean, empty form for the next report.
export default function Report() {
  const [run, setRun] = useState(0);
  const navigate = useNavigate();
  const restart = () => {
    navigate('/report', { replace: true, state: null }); // drop any prefill from the fact-check screen
    setRun((r) => r + 1);
    window.scrollTo(0, 0);
  };
  return <ReportForm key={run} onRestart={restart} />;
}

function ReportForm({ onRestart }: { onRestart: () => void }) {
  const t = useT();
  const prefill = (useLocation().state ?? {}) as ReportPrefill;
  const fromChat = Boolean(prefill.link || prefill.description);
  // Coming from the fact-check chat means it happened online, so skip the first question.
  const [step, setStep] = useState(fromChat ? 1 : 0);
  const [mode, setMode] = useState<Mode | null>(fromChat ? 'online' : null);
  const [victim, setVictim] = useState<Victim | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [area, setArea] = useState('');
  const [link, setLink] = useState(prefill.link ?? '');
  const [description, setDescription] = useState(prefill.description ?? '');
  const [when, setWhen] = useState<When | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [consentPartners, setConsentPartners] = useState(false);
  // Off by default: a list of reports on the phone could be seen by someone else.
  const [keepCopy, setKeepCopy] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneInfo | null>(null);

  const next = () => {
    setError(null);
    setStep((s) => s + 1);
  };
  const back = () => {
    setError(null);
    setStep((s) => (mode === 'in-person' && s === 4 ? 1 : Math.max(0, s - 1)));
  };

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(t.report.tooManyImages(MAX_IMAGES));
    for (const f of Array.from(files).slice(0, room)) {
      try {
        const url = await stripAndShrink(f);
        setImages((prev) => [...prev, url]);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }

  const online = mode === 'online';
  const emergency = load('emergencyNumber', '112');
  const inDanger = category != null && DANGER_CATEGORIES.includes(category);

  function chooseMode(m: Mode) {
    if (m !== mode) {
      // Answers from the other branch don't apply any more.
      setCategory(null);
      setPlatform(null);
      setPlace(null);
      setLink('');
      setArea('');
    }
    setMode(m);
    next();
  }

  function storyNext() {
    if (!description.trim()) return setError(t.report.errStory);
    if (!victim) return setError(t.report.errVictim);
    if (!category) return setError(t.report.errCategory);
    if (!place) return setError(t.report.errPlace);
    setError(null);
    setStep(4);
  }

  function detailsNext() {
    if (online) {
      if (!link.trim() && !description.trim() && images.length === 0)
        return setError(t.report.errEvidence);
      if (link.trim() && !isValidUrl(link.trim())) return setError(t.report.errLink);
    }
    next();
  }

  function send() {
    const daysAgo = WHEN.find((w) => w.id === when)?.daysAgo;
    const incidentDate =
      daysAgo == null ? undefined : new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
    const report: ReportInput = {
      id: crypto.randomUUID(),
      mode: mode!,
      victim: victim!,
      category: category!,
      platform: online ? platform! : undefined,
      place: online ? undefined : place!,
      area: online ? undefined : area.trim() || undefined,
      link: online ? link.trim() || undefined : undefined,
      description: description.trim() || undefined,
      incidentDate,
      images,
      // Research use is a condition of sending; the form says so above the Send button.
      consentResearch: true,
      consentPartners,
      contactEmail: contactEmail.trim() || undefined,
      origin: 'form',
    };
    try {
      enqueue(report);
    } catch (e) {
      return setError((e as Error).message);
    }
    const ref = report.id.slice(0, 8).toUpperCase();
    if (keepCopy) {
      save('history', [{ ref, date: new Date().toISOString(), category: report.category }, ...load<HistoryItem[]>('history', [])].slice(0, 20));
    }
    setDone({ ref, queued: !navigator.onLine, kept: keepCopy, withEmail: Boolean(report.contactEmail) });
  }

  if (done)
    return <Done mode={mode!} victim={victim!} platform={platform} inDanger={inDanger} info={done} onRestart={onRestart} />;

  return (
    <div className="stack wizard">
      <Progress steps={(mode === 'in-person' ? IN_PERSON_STEPS : ONLINE_STEPS).map((s) => t.report.steps[s])} current={mode === 'in-person' ? IN_PERSON_INDEX[step] : step} />

      {step === 0 && (
        <>
          <h1>{t.report.whereTitle}</h1>
          <p className="muted">{t.report.whereIntro}</p>
          <div className="choices">
            {MODES.map((m) => (
              <button key={m.id} className={`choice ${mode === m.id ? 'on' : ''}`} onClick={() => chooseMode(m.id)}>
                <strong>{t.modes[m.id].label}</strong>
                <span>{t.modes[m.id].hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && !online && (
        <>
          <h1>{t.report.storyTitle}</h1>
          <p className="muted">{t.report.storyIntro}</p>
          <textarea
            className="story"
            rows={6}
            autoFocus
            placeholder={t.report.storyPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <span className="label">{t.report.whoLabel}</span>
            <div className="chips">
              {VICTIMS.map((v) => (
                <button key={v.id} className={`chip small ${victim === v.id ? 'on' : ''}`} onClick={() => setVictim(v.id)}>
                  {t.victims[v.id].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">{t.report.whatLabel}</span>
            <div className="chips">
              {IN_PERSON_CATEGORIES.map((c) => (
                <button key={c} className={`chip small ${category === c ? 'on' : ''}`} title={t.categories[c].hint} onClick={() => setCategory(c)}>
                  {t.categories[c].label}
                </button>
              ))}
            </div>
          </div>

          {inDanger && (
            <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
              <div>
                <strong>{t.report.dangerTitle}</strong>
                <span>{t.report.dangerHint}</span>
              </div>
              <span className="call-button">{t.common.callNumber(emergency)}</span>
            </a>
          )}

          <div>
            <span className="label">{t.report.whereLabel}</span>
            <div className="chips">
              {PLACES.map((p) => (
                <button key={p} className={`chip small ${place === p ? 'on' : ''}`} onClick={() => setPlace(p)}>
                  {t.places[p]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 1 && online && (
        <>
          <h1>{t.report.whoTitle}</h1>
          <p className="muted">{t.report.whoIntro}</p>
          <div className="choices">
            {VICTIMS.map((v) => (
              <button
                key={v.id}
                className={`choice ${victim === v.id ? 'on' : ''}`}
                onClick={() => {
                  setVictim(v.id);
                  next();
                }}
              >
                <strong>{t.victims[v.id].label}</strong>
                {t.victims[v.id].hint && <span>{t.victims[v.id].hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && online && (
        <>
          <h1>{t.report.whatTitle}</h1>
          <div className="choices grid">
            {ONLINE_CATEGORIES.map((c) => (
              <button
                key={c}
                className={`choice ${category === c ? 'on' : ''}`}
                onClick={() => {
                  setCategory(c);
                  next();
                }}
              >
                <strong>{t.categories[c].label}</strong>
                <span>{t.categories[c].hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && online && (
        <>
          <h1>{t.report.platformTitle}</h1>
          <div className="chips">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                className={`chip ${platform === p ? 'on' : ''}`}
                onClick={() => {
                  setPlatform(p);
                  next();
                }}
              >
                {p === 'Other' ? t.platformOther : p}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h1>{online ? t.report.showUs : t.report.anythingElse}</h1>
          <p className="muted">{online ? t.report.anyOne : t.report.allOptional}</p>

          {online && (
            <label>
              {t.report.linkLabel}
              <input type="url" inputMode="url" placeholder="https://instagram.com/p/…" value={link} onChange={(e) => setLink(e.target.value)} />
            </label>
          )}

          <label className="upload">
            {online ? t.report.addScreenshots : t.report.addPhotos}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => addFiles(e.target.files)} />
            <small className="muted">{t.report.metadataRemoved}</small>
          </label>
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={i} onClick={() => setImages(images.filter((_, j) => j !== i))} title={t.report.tapToRemove}>
                  <img src={src} alt={t.report.screenshotAlt(i + 1)} />
                </button>
              ))}
            </div>
          )}

          {online && (
            <label>
              {t.report.fewWords}
              <textarea
                rows={3}
                placeholder={t.report.fewWordsPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          )}

          {!online && (
            <label>
              {t.report.areaLabel}
              <input maxLength={80} placeholder={t.report.areaPlaceholder} value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
          )}

          <div>
            <span className="label">{t.report.whenLabel}</span>
            <div className="chips">
              {WHEN.map((w) => (
                <button key={w.id} className={`chip small ${when === w.id ? 'on' : ''}`} onClick={() => setWhen(w.id)}>
                  {t.report.when[w.id]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h1>{t.report.almostDone}</h1>
          <div className="summary card">
            <span>
              <b>{t.report.sumHow}</b> {t.modes[mode!].label}
            </span>
            <span>
              <b>{t.report.sumWho}</b> {victim && t.victims[victim].label}
            </span>
            <span>
              <b>{t.report.sumWhat}</b> {category && t.categories[category].label}
            </span>
            <span>
              <b>{t.report.sumWhere}</b> {online ? (platform === 'Other' ? t.platformOther : platform) : [place && t.places[place], area.trim()].filter(Boolean).join(', ')}
              {when && when !== 'unsure' && ` · ${t.report.when[when].toLocaleLowerCase(t.locale)}`}
            </span>
            <span>
              <b>{online ? t.report.sumEvidence : t.report.sumDetails}</b>{' '}
              {[
                link && t.report.sumLink,
                images.length > 0 && (online ? t.report.sumScreenshots(images.length) : t.report.sumPhotos(images.length)),
                description && t.report.sumDescription,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>

          <p className="notice">
            <strong>{t.report.useTitle}</strong> {t.report.useBody}
          </p>

          <fieldset>
            <legend>{t.report.sharePartners}</legend>
            <label className="check">
              <input type="checkbox" checked={consentPartners} onChange={(e) => setConsentPartners(e.target.checked)} />
              <span>
                {t.report.sharePartnersYes}
                <small className="muted">{t.report.sharePartnersHint}</small>
              </span>
            </label>
          </fieldset>

          <fieldset>
            <legend>{t.report.keepTitle}</legend>
            <label className="check">
              <input type="radio" name="keep" checked={!keepCopy} onChange={() => setKeepCopy(false)} />
              <span>
                {t.report.keepNo}
                <small className="muted">{t.report.keepNoHint}</small>
              </span>
            </label>
            <label className="check">
              <input type="radio" name="keep" checked={keepCopy} onChange={() => setKeepCopy(true)} />
              <span>
                {t.report.keepYes}
                <small className="muted">{t.report.keepYesHint}</small>
              </span>
            </label>
          </fieldset>

          <details>
            <summary>{t.report.contactTitle}</summary>
            <label>
              {t.report.email}
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <small className="muted">{t.report.emailHint}</small>
            </label>
          </details>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row between wizard-nav">
        {step > 0 ? (
          <button className="button ghost" onClick={back}>
            {t.common.back}
          </button>
        ) : (
          <span />
        )}
        {step === 1 && !online && (
          <button className="button" onClick={storyNext}>
            {t.common.next}
          </button>
        )}
        {step === 4 && (
          <button className="button" onClick={detailsNext}>
            {t.common.next}
          </button>
        )}
        {step === 5 && (
          <button className="button" onClick={send}>
            {t.report.sendReport}
          </button>
        )}
      </div>
    </div>
  );
}

interface DoneInfo {
  ref: string;
  queued: boolean;
  kept: boolean;
  withEmail: boolean;
}

function Done({
  mode,
  victim,
  platform,
  inDanger,
  info,
  onRestart,
}: {
  mode: Mode;
  victim: Victim;
  platform: Platform | null;
  inDanger: boolean;
  info: DoneInfo;
  onRestart: () => void;
}) {
  const t = useT();
  const d = t.report.done;
  const onPlatform = platform != null && platform !== 'Other';
  const emergency = load('emergencyNumber', '112');
  return (
    <div className="stack done">
      <div className="done-icon">
        <CheckIcon size={36} />
      </div>
      <h1>{d.title}</h1>
      <p>{info.queued ? d.queued : d.sent}</p>

      {inDanger && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>{d.dangerTitle}</strong>
            <span>{d.dangerHint}</span>
          </div>
          <span className="call-button">{t.common.callNumber(emergency)}</span>
        </a>
      )}

      <section className="card">
        <h2>{d.nextTitle}</h2>
        <ol className="next-steps">
          <li>
            <strong>{d.step1}</strong>
            <span>{d.step1Hint}</span>
          </li>
          <li>
            <strong>{d.step2}</strong>
            <span>{d.step2Hint}</span>
          </li>
          <li>
            <strong>{info.withEmail ? d.mayEmail : d.noContact}</strong>
            <span>{info.withEmail ? d.mayEmailHint : d.noContactHint}</span>
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>{d.waitTitle}</h2>
        {mode === 'online' ? (
          <ul className="tips">
            <li>{d.onlineTips[0]}</li>
            {onPlatform && <li>{d.reportOnPlatform(platform)}</li>}
            {d.onlineTips.slice(1).map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : (
          <ul className="tips">
            {d.inPersonTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
            {inDanger && <li>{d.hurtTip}</li>}
          </ul>
        )}
        <Link to="/guides" className="link">
          {d.moreTips}
        </Link>
      </section>

      <p className="muted">
        {d.reference} <code>{info.ref}</code>
        <br />
        {info.kept ? d.kept : d.notKept}
      </p>

      {victim === 'me' && (
        <section className="card care">
          <strong>{d.careTitle}</strong>
          <span>{d.careBody}</span>
          <div className="row">
            <Link to="/contacts" className="button small">
              {d.callHelpline}
            </Link>
            <Link to="/hubs" className="button small ghost">
              {d.findHelp}
            </Link>
          </div>
        </section>
      )}
      {victim === 'someone-i-know' && (
        <section className="card care">
          <strong>{d.otherTitle}</strong>
          <span>{d.otherBody}</span>
          <Link to="/guides" className="button small ghost">
            {d.readGuides}
          </Link>
        </section>
      )}

      <div className="done-actions">
        <button className="button" onClick={onRestart}>
          {d.again}
        </button>
        <Link to="/" className="button ghost">
          {d.home}
        </Link>
      </div>
    </div>
  );
}

function Progress({ steps, current }: { steps: string[]; current: number }) {
  const t = useT();
  return (
    <div className="progress" aria-label={t.report.progress(current + 1, steps.length, steps[current])}>
      {steps.map((s, i) => (
        <span key={s} className={i < current ? 'done' : i === current ? 'current' : ''} />
      ))}
    </div>
  );
}
