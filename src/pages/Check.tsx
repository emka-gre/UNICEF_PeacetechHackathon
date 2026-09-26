import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatTurn, FactCheckAnswer, ReportInput } from '../shared';
import { stripAndShrink } from '../lib/image';
import { enqueue, useOnline } from '../lib/queue';
import type { ReportPrefill } from './Report';
import { CameraIcon } from '../icons';
import { getLang, useT } from '../i18n';

type Message = ChatTurn & { answer?: FactCheckAnswer };

const VERDICT_CLASS: Record<FactCheckAnswer['verdict'], string> = {
  'Likely false': 'false',
  Misleading: 'misleading',
  Unverified: 'unverified',
  'Likely true': 'true',
};

// The conversation lives only in memory; quick exit or leaving the page clears it.
export default function Check() {
  const online = useOnline();
  const navigate = useNavigate();
  const t = useT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, busy]);

  async function ask(question: string) {
    if (!question.trim() && !image) return;
    const turn: Message = { role: 'user', text: question.trim(), image: image ?? undefined };
    const history = [...messages, turn];
    setMessages(history);
    setText('');
    setImage(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/factcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only the latest image is sent again; older ones are dropped to keep requests small.
        // The app language tells the assistant what to answer in when the question itself doesn't (e.g. a lone screenshot).
        body: JSON.stringify({
          lang: getLang(),
          history: history.map((m, i) => ({ role: m.role, text: m.text, image: i === history.length - 1 ? m.image : undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const answer = data as FactCheckAnswer;
      setMessages([...history, { role: 'assistant', text: `VERDICT: ${answer.verdict}\n${answer.text}`, answer }]);
    } catch {
      setError(t.check.failed);
    } finally {
      setBusy(false);
    }
  }

  const firstQuestion = messages.find((m) => m.role === 'user');
  const lastAnswer = [...messages].reverse().find((m) => m.answer)?.answer;
  const link = firstQuestion?.text.match(/https?:\/\/\S+/)?.[0];

  function reportIt() {
    const prefill: ReportPrefill = { link, description: firstQuestion?.text };
    navigate('/report', { state: prefill });
  }

  // Sends the claim to Laaha moderators as a report, tagged as coming from the assistant.
  function sendForReview() {
    if (!firstQuestion) return;
    const report: ReportInput = {
      id: crypto.randomUUID(),
      victim: 'not-say',
      category: 'Other',
      mode: 'online',
      platform: 'Other',
      link,
      description: `${firstQuestion.text}\n\n[Assistant said: ${lastAnswer?.verdict ?? 'no answer'}, ${lastAnswer?.confidence ?? '-'} confidence]`,
      images: firstQuestion.image ? [firstQuestion.image] : [],
      consentResearch: true, // research use is a condition of sending, as on the report form
      consentPartners: false,
      origin: 'fact-check',
    };
    enqueue(report);
    setEscalated(true);
  }

  return (
    <div className="stack chat">
      <h1>{t.check.title}</h1>
      <p className="muted">{t.check.intro}</p>

      {messages.length === 0 && (
        <div className="stack">
          {t.check.examples.map((ex) => (
            <button key={ex} className="example" onClick={() => ask(ex)} disabled={!online || busy}>
              “{ex}”
            </button>
          ))}
        </div>
      )}

      <div className="messages">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="bubble user">
              {m.image && <img src={m.image} alt={t.check.yourScreenshot} />}
              {m.text}
            </div>
          ) : (
            <Answer key={i} a={m.answer!} />
          ),
        )}
        {busy && (
          <div className="bubble bot typing">
            <span />
            <span />
            <span />
            <small className="muted">{t.check.searching}</small>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="error">{error}</p>}

      {lastAnswer && (
        <div className="card escalate">
          <strong>{t.check.whatNext}</strong>
          <small className="muted">{t.check.whatNextHint}</small>
          <div className="row">
            <button className="button small" onClick={reportIt}>
              {t.check.reportPost}
            </button>
            {escalated ? (
              <span className="muted">{t.check.sentToReviewer}</span>
            ) : (
              <button className="button small ghost" onClick={sendForReview}>
                {t.check.askHuman}
              </button>
            )}
            <button className="link" onClick={() => location.assign('/check')}>
              {t.check.newQuestion}
            </button>
          </div>
        </div>
      )}

      {!online ? (
        <p className="banner offline">{t.check.needsInternet}</p>
      ) : (
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(text);
          }}
        >
          {image && (
            <div className="thumbs">
              <button type="button" onClick={() => setImage(null)} title={t.check.remove}>
                <img src={image} alt={t.check.attached} />
              </button>
            </div>
          )}
          <div className="row">
            <label className="attach" title={t.check.addScreenshot}>
              <CameraIcon />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    setImage(await stripAndShrink(f));
                  } catch (err) {
                    setError((err as Error).message);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <input
              placeholder={messages.length ? t.check.followUp : t.check.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <button className="button" disabled={busy || (!text.trim() && !image)}>
              {t.check.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Answer({ a }: { a: FactCheckAnswer }) {
  const t = useT();
  return (
    <div className="bubble bot">
      <div className="row">
        <span className={`verdict ${VERDICT_CLASS[a.verdict]}`}>{t.check.verdicts[a.verdict]}</span>
        <span className="muted">{t.check.confidence[a.confidence]}</span>
      </div>
      <p>{a.text}</p>
      {a.sources.length > 0 && (
        <div className="sources">
          <small className="muted">{t.check.sources}</small>
          {a.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener">
              {s.title || new URL(s.url).hostname}
            </a>
          ))}
        </div>
      )}
      {a.demo && <small className="muted">{t.check.demo}</small>}
    </div>
  );
}
