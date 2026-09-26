import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatTurn, FactCheckAnswer, ReportInput } from '../shared';
import { stripAndShrink } from '../lib/image';
import { enqueue, useOnline } from '../lib/queue';
import type { ReportPrefill } from './Report';
import { CameraIcon } from '../icons';

type Message = ChatTurn & { answer?: FactCheckAnswer };

const EXAMPLES = [
  'Is it true that this journalist was arrested for lying?',
  'This photo of a woman politician is going viral. Is it real?',
  'A post says women who report harassment are lying for attention.',
];

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
        body: JSON.stringify({
          history: history.map((m, i) => ({ role: m.role, text: m.text, image: i === history.length - 1 ? m.image : undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      const answer = data as FactCheckAnswer;
      setMessages([...history, { role: 'assistant', text: `VERDICT: ${answer.verdict}\n${answer.text}`, answer }]);
    } catch (e) {
      setError((e as Error).message);
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
      <h1>Is it true?</h1>
      <p className="muted">
        Paste a claim or a link, or add a screenshot. The assistant searches for sources and tells you what it finds. It can be wrong,
        so check its sources.
      </p>

      {messages.length === 0 && (
        <div className="stack">
          {EXAMPLES.map((ex) => (
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
              {m.image && <img src={m.image} alt="Your screenshot" />}
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
            <small className="muted">Searching sources…</small>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="error">{error}</p>}

      {lastAnswer && (
        <div className="card escalate">
          <strong>What next?</strong>
          <small className="muted">Anything you send to Laaha is used, without your details, in anonymous research.</small>
          <div className="row">
            <button className="button small" onClick={reportIt}>
              Report this post
            </button>
            {escalated ? (
              <span className="muted">Sent to a Laaha reviewer</span>
            ) : (
              <button className="button small ghost" onClick={sendForReview}>
                Ask a human to check
              </button>
            )}
            <button className="link" onClick={() => location.assign('/check')}>
              New question
            </button>
          </div>
        </div>
      )}

      {!online ? (
        <p className="banner offline">The assistant needs an internet connection.</p>
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
              <button type="button" onClick={() => setImage(null)} title="Remove">
                <img src={image} alt="Attached screenshot" />
              </button>
            </div>
          )}
          <div className="row">
            <label className="attach" title="Add a screenshot">
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
              placeholder={messages.length ? 'Ask a follow-up…' : 'Paste a claim or link…'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <button className="button" disabled={busy || (!text.trim() && !image)}>
              Check
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Answer({ a }: { a: FactCheckAnswer }) {
  return (
    <div className="bubble bot">
      <div className="row">
        <span className={`verdict ${VERDICT_CLASS[a.verdict]}`}>{a.verdict}</span>
        <span className="muted">{a.confidence} confidence</span>
      </div>
      <p>{a.text}</p>
      {a.sources.length > 0 && (
        <div className="sources">
          <small className="muted">Sources</small>
          {a.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer noopener">
              {s.title || new URL(s.url).hostname}
            </a>
          ))}
        </div>
      )}
      {a.demo && <small className="muted">Demo mode: the AI isn't connected yet.</small>}
    </div>
  );
}
