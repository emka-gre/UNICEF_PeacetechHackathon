import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CATEGORY_HINTS,
  DANGER_CATEGORIES,
  MAX_IMAGES,
  MODES,
  PLACES,
  PLATFORMS,
  VICTIMS,
  categoriesFor,
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

const WHEN = [
  { label: 'Today', daysAgo: 0 },
  { label: 'This week', daysAgo: 3 },
  { label: 'This month', daysAgo: 15 },
  { label: 'Earlier', daysAgo: 60 },
  { label: 'Not sure', daysAgo: null },
] as const;

const STEPS = ['Online or in person', 'Who', 'What', 'Where', 'Details', 'Send'];

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
  const [when, setWhen] = useState<string | null>(null);
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
    setStep((s) => Math.max(0, s - 1));
  };

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(`You can add up to ${MAX_IMAGES} photos or screenshots.`);
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

  function detailsNext() {
    if (online) {
      if (!link.trim() && !description.trim() && images.length === 0)
        return setError('Add at least one: a link, a screenshot, or a few words.');
      if (link.trim() && !isValidUrl(link.trim())) return setError('The link should start with https://');
    } else if (!description.trim() && images.length === 0) {
      return setError('Tell us in a few words what happened.');
    }
    next();
  }

  function send() {
    const daysAgo = WHEN.find((w) => w.label === when)?.daysAgo;
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
      <div className="progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s} className={i < step ? 'done' : i === step ? 'current' : ''} />
        ))}
      </div>

      {step === 0 && (
        <>
          <h1>Where did it happen?</h1>
          <p className="muted">You can report both. Nothing is published.</p>
          <div className="choices">
            {MODES.map((m) => (
              <button key={m.id} className={`choice ${mode === m.id ? 'on' : ''}`} onClick={() => chooseMode(m.id)}>
                <strong>{m.label}</strong>
                <span>{m.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1>Who was targeted?</h1>
          <p className="muted">You can stay anonymous. Nothing is published.</p>
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
                <strong>{v.label}</strong>
                {v.hint && <span>{v.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && mode && (
        <>
          <h1>What happened?</h1>
          <div className="choices grid">
            {categoriesFor(mode).map((c) => (
              <button
                key={c}
                className={`choice ${category === c ? 'on' : ''}`}
                onClick={() => {
                  setCategory(c);
                  next();
                }}
              >
                <strong>{c}</strong>
                <span>{CATEGORY_HINTS[c]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && online && (
        <>
          <h1>Where did you see it?</h1>
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
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && !online && (
        <>
          <h1>Where did it happen?</h1>
          <div className="chips">
            {PLACES.map((p) => (
              <button
                key={p}
                className={`chip ${place === p ? 'on' : ''}`}
                onClick={() => {
                  setPlace(p);
                  next();
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h1>{online ? 'Show us' : 'Tell us what happened'}</h1>
          {inDanger && (
            <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
              <div>
                <strong>Are you in danger right now?</strong>
                <span>Call emergency services first. You can finish this report later.</span>
              </div>
              <span className="call-button">Call {emergency}</span>
            </a>
          )}
          <p className="muted">{online ? 'Any one of these is enough.' : 'Only share what you feel comfortable with.'}</p>

          {online && (
            <label>
              Link to the post
              <input type="url" inputMode="url" placeholder="https://instagram.com/p/…" value={link} onChange={(e) => setLink(e.target.value)} />
            </label>
          )}

          {!online && (
            <label>
              In a few words *
              <textarea
                rows={4}
                placeholder="What happened? Who was involved (no names needed)? Please don't include other people's phone numbers or addresses."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          )}

          <label className="upload">
            {online ? 'Add screenshots' : 'Add photos (optional)'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => addFiles(e.target.files)} />
            <small className="muted">Location and camera details are removed on your phone.</small>
          </label>
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((src, i) => (
                <button key={i} onClick={() => setImages(images.filter((_, j) => j !== i))} title="Tap to remove">
                  <img src={src} alt={`Screenshot ${i + 1}`} />
                </button>
              ))}
            </div>
          )}

          {online && (
            <label>
              In a few words
              <textarea
                rows={3}
                placeholder="What does it say? Please don't include other people's phone numbers or addresses."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          )}

          {!online && (
            <label>
              Which town or area? (optional)
              <input maxLength={80} placeholder="For example a city or neighbourhood, not an exact address" value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
          )}

          <div>
            <span className="label">When?</span>
            <div className="chips">
              {WHEN.map((w) => (
                <button key={w.label} className={`chip small ${when === w.label ? 'on' : ''}`} onClick={() => setWhen(w.label)}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h1>Almost done</h1>
          <div className="summary card">
            <span>
              <b>How:</b> {online ? 'Online' : 'In person'}
            </span>
            <span>
              <b>Who:</b> {VICTIMS.find((v) => v.id === victim)?.label}
            </span>
            <span>
              <b>What:</b> {category}
            </span>
            <span>
              <b>Where:</b> {online ? platform : [place, area.trim()].filter(Boolean).join(', ')}
              {when && when !== 'Not sure' && ` · ${when.toLowerCase()}`}
            </span>
            <span>
              <b>{online ? 'Evidence' : 'Details'}:</b>{' '}
              {[link && 'link', images.length > 0 && `${images.length} ${online ? 'screenshot(s)' : 'photo(s)'}`, description && 'description']
                .filter(Boolean)
                .join(', ')}
            </span>
          </div>

          <p className="notice">
            <strong>How we use your report.</strong> Laaha uses every report, without your name or contact details, in anonymous
            research and advocacy. It helps us show platforms, governments and communities how women are targeted, online and offline.
          </p>

          <fieldset>
            <legend>Share with partner organisations? (optional)</legend>
            <label className="check">
              <input type="checkbox" checked={consentPartners} onChange={(e) => setConsentPartners(e.target.checked)} />
              <span>
                Yes, share with partner organisations
                <small className="muted">For example legal aid, if they can help.</small>
              </span>
            </label>
          </fieldset>

          <fieldset>
            <legend>Keep it on this phone?</legend>
            <label className="check">
              <input type="radio" name="keep" checked={!keepCopy} onChange={() => setKeepCopy(false)} />
              <span>
                No, don't keep a copy
                <small className="muted">Safer if someone else might look at your phone.</small>
              </span>
            </label>
            <label className="check">
              <input type="radio" name="keep" checked={keepCopy} onChange={() => setKeepCopy(true)} />
              <span>
                Yes, show it in "My reports"
                <small className="muted">Only the date, the type and a reference code. You can delete it any time.</small>
              </span>
            </label>
          </fieldset>

          <details>
            <summary>Want us to contact you? (optional)</summary>
            <label>
              Email
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <small className="muted">Only Laaha staff will see it. Leave empty to stay anonymous.</small>
            </label>
          </details>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row between wizard-nav">
        {step > 0 ? (
          <button className="button ghost" onClick={back}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step === 4 && (
          <button className="button" onClick={detailsNext}>
            Next
          </button>
        )}
        {step === 5 && (
          <button className="button" onClick={send}>
            Send report
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
  const onPlatform = platform != null && platform !== 'Other';
  const emergency = load('emergencyNumber', '112');
  return (
    <div className="stack done">
      <div className="done-icon">
        <CheckIcon size={36} />
      </div>
      <h1>Thank you. You did the right thing.</h1>
      <p>
        {info.queued
          ? "You're offline right now. Your report is kept on this phone only until it can be sent, then removed automatically. You don't need to do anything."
          : 'Your report has reached Laaha. It will not be published, and the people in it will not be told who reported it.'}
      </p>

      {inDanger && (
        <a className="helpline helpline-emergency" href={`tel:${emergency}`}>
          <div>
            <strong>If you are in danger, don't wait</strong>
            <span>Call emergency services now.</span>
          </div>
          <span className="call-button">Call {emergency}</span>
        </a>
      )}

      <section className="card">
        <h2>What happens next</h2>
        <ol className="next-steps">
          <li>
            <strong>A trained moderator reads it</strong>
            <span>Usually within 3 working days. They check the evidence and whether it is misinformation or harm.</span>
          </li>
          <li>
            <strong>It helps us see the bigger picture</strong>
            <span>
              It is counted, without your details, in anonymous data we share with platforms and governments to push for change.
            </span>
          </li>
          <li>
            <strong>{info.withEmail ? 'We may email you' : 'We will not contact you'}</strong>
            <span>
              {info.withEmail
                ? 'Only if we need more details or can offer help. You can ignore it or reply at any time.'
                : "You stayed anonymous, so we can't reach you. That's completely fine."}
            </span>
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>While you wait</h2>
        {mode === 'online' ? (
          <ul className="tips">
            <li>Don't reply to the post or the people sharing it. Replies often make it spread further.</li>
            {onPlatform && <li>Report it on {platform} as well, using the post's "Report" option.</li>}
            <li>Block or mute accounts that are targeting you.</li>
            <li>Keep your screenshots in case you need them later.</li>
          </ul>
        ) : (
          <ul className="tips">
            <li>Write down what happened while you remember it: the date, the place, and anyone who saw it.</li>
            <li>Keep any messages, photos or medical papers. They can help if you go to the police or a lawyer.</li>
            <li>Tell someone you trust, and avoid going to that place alone for now if you can.</li>
            {inDanger && <li>If you were hurt, a doctor or clinic can help, even days later. Legal aid is free at several partners.</li>}
          </ul>
        )}
        <Link to="/guides" className="link">
          More tips in the safety guides
        </Link>
      </section>

      <p className="muted">
        Reference: <code>{info.ref}</code>
        <br />
        {info.kept
          ? 'Saved in "My reports" on the home screen.'
          : 'Not saved on this phone. Note the reference if you want to ask about it later.'}
      </p>

      {victim === 'me' && (
        <section className="card care">
          <strong>How are you doing?</strong>
          <span>What happened to you is not your fault. If you'd like, talk to someone.</span>
          <div className="row">
            <Link to="/contacts" className="button small">
              Call a helpline
            </Link>
            <Link to="/hubs" className="button small ghost">
              Find help near you
            </Link>
          </div>
        </section>
      )}
      {victim === 'someone-i-know' && (
        <section className="card care">
          <strong>Helping someone you know</strong>
          <span>Let her know she's not alone, and share this app or a guide with her if it's safe to do so.</span>
          <Link to="/guides" className="button small ghost">
            Read the guides
          </Link>
        </section>
      )}

      <div className="done-actions">
        <button className="button" onClick={onRestart}>
          Report something else
        </button>
        <Link to="/" className="button ghost">
          Back to home
        </Link>
      </div>
    </div>
  );
}
