import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCode, getCover, tryUnlock, unlockWithoutCode, useDiscreet } from '../lib/safety';
import { CheckIcon, ChevronLeftIcon, ClockIcon, ComposeIcon, FlameIcon, GearIcon, HeartIcon, PushpinIcon, SearchIcon, TrashIcon, UsersIcon } from '../icons';
import { load, save } from '../lib/storage';
import '../cover.css';
import { useT, type Messages } from '../i18n';

// The fake app shown in discreet mode. Each cover really works, so it holds up if someone
// looks through it. Typing the secret code in its search / code box opens the real app.
export default function Cover() {
  useDiscreet(); // re-render when the cover choice changes
  const cover = getCover();
  const t = useT();
  const navigate = useNavigate();

  // Every cover has a text box; the code is checked as the person types.
  function onType(value: string) {
    if (tryUnlock(value)) {
      navigate('/', { replace: true });
      return true;
    }
    return false;
  }

  // With no code set, holding the title for 2 seconds opens the real app.
  const hold = useRef<ReturnType<typeof setTimeout>>();
  const startHold = () => {
    hold.current = setTimeout(() => unlockWithoutCode() && navigate('/', { replace: true }), 2000);
  };
  const stopHold = () => clearTimeout(hold.current);

  // Settings button: goes to the real Settings (where discreet mode can be turned off).
  // With a code set it asks for it first, like an ordinary app lock.
  const [asking, setAsking] = useState(false);
  const [pass, setPass] = useState('');
  const [wrong, setWrong] = useState(false);

  function openSettings() {
    if (unlockWithoutCode()) navigate('/settings', { replace: true });
    else setAsking(true);
  }

  function submitPass(e: React.FormEvent) {
    e.preventDefault();
    if (tryUnlock(pass)) navigate('/settings', { replace: true });
    else {
      setWrong(true);
      setPass('');
    }
  }

  return (
    <div className={`cover cover-${cover}`}>
      <header className="cover-top">
        <span
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
        >
          {t.covers[cover].name}
        </span>
        <button className="gear cover-gear" onClick={openSettings} aria-label={t.common.settings}>
          <GearIcon />
        </button>
      </header>
      <main className="stack">
        {asking && getCode() && (
          <form className="card stack" onSubmit={submitPass}>
            <strong>{t.cover.locked}</strong>
            <label>
              {t.cover.passcode}
              <input type="password" value={pass} autoFocus autoComplete="off" onChange={(e) => (setPass(e.target.value), setWrong(false))} />
            </label>
            {wrong && <p className="error">{t.cover.wrong}</p>}
            <div className="row">
              <button className="button small">{t.cover.open}</button>
              <button type="button" className="button small ghost" onClick={() => (setAsking(false), setPass(''), setWrong(false))}>
                {t.common.cancel}
              </button>
            </div>
          </form>
        )}
        {cover === 'recipes' && <Recipes onType={onType} />}
        {cover === 'notes' && <Notes onType={onType} />}
        {cover === 'game' && <Game onType={onType} />}
      </main>
    </div>
  );
}

type OnType = (value: string) => boolean;

/** A search box that clears itself when the code is typed, so the code never stays on screen. */
function SecretInput({ onType, placeholder, value, setValue }: { onType: OnType; placeholder: string; value: string; setValue: (v: string) => void }) {
  return (
    <input
      type="search"
      className="cv-field"
      placeholder={placeholder}
      value={value}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onChange={(e) => setValue(onType(e.target.value) ? '' : e.target.value)}
    />
  );
}

/** The secret input dressed as an ordinary search bar. */
function SearchBar(props: { onType: OnType; placeholder: string; value: string; setValue: (v: string) => void }) {
  return (
    <div className="cv-search">
      <SearchIcon />
      <SecretInput {...props} />
    </div>
  );
}

/* ---------- Recipes ---------- */

type Category = 'Breakfast' | 'Soups' | 'Mains' | 'Salads' | 'Baking';
type RecipeId = keyof Messages['cover']['recipes']['items'];

interface RecipeData {
  id: RecipeId;
  category: Category;
  minutes: number;
  serves: number;
  level: 'Easy' | 'Medium';
  kcal: number;
  emoji: string;
  tone: [string, string];
}

/** Name, blurb, ingredients, steps and tip come from i18n (cover.recipes.items). */
type Recipe = RecipeData & Messages['cover']['recipes']['items'][RecipeId];

const RECIPES: RecipeData[] = [
  { id: 'lentil-soup', category: 'Soups', minutes: 35, serves: 4, level: 'Easy', kcal: 280, emoji: '🍲', tone: ['#f6c28b', '#e0793f'] },
  { id: 'shakshuka', category: 'Breakfast', minutes: 25, serves: 2, level: 'Easy', kcal: 340, emoji: '🍳', tone: ['#f7a58a', '#d2452f'] },
  { id: 'banana-bread', category: 'Baking', minutes: 70, serves: 8, level: 'Easy', kcal: 310, emoji: '🍌', tone: ['#fbe29a', '#e3a63c'] },
  { id: 'tabbouleh', category: 'Salads', minutes: 20, serves: 4, level: 'Easy', kcal: 190, emoji: '🥗', tone: ['#c8e6a0', '#6fa74a'] },
  { id: 'chicken-rice', category: 'Mains', minutes: 45, serves: 4, level: 'Medium', kcal: 520, emoji: '🍗', tone: ['#f5d38a', '#c98a2b'] },
  { id: 'pancakes', category: 'Breakfast', minutes: 20, serves: 3, level: 'Easy', kcal: 260, emoji: '🥞', tone: ['#f9dcb0', '#d99a4e'] },
  { id: 'chickpea-curry', category: 'Mains', minutes: 40, serves: 4, level: 'Medium', kcal: 410, emoji: '🍛', tone: ['#f7c77a', '#d0772a'] },
  { id: 'village-salad', category: 'Salads', minutes: 15, serves: 2, level: 'Easy', kcal: 230, emoji: '🍅', tone: ['#f8b4a4', '#d9534f'] },
  { id: 'lemon-cake', category: 'Baking', minutes: 55, serves: 10, level: 'Medium', kcal: 330, emoji: '🍋', tone: ['#fff1a6', '#e4c23a'] },
  { id: 'tomato-pasta', category: 'Mains', minutes: 25, serves: 4, level: 'Easy', kcal: 450, emoji: '🍝', tone: ['#f6b08e', '#c7502d'] },
];

const CATEGORIES = ['All', 'Saved', 'Quick', 'Breakfast', 'Soups', 'Mains', 'Salads', 'Baking'] as const;
type Filter = (typeof CATEGORIES)[number];

function greeting(t: Messages) {
  const h = new Date().getHours();
  return h < 12 ? t.cover.recipes.morning : h < 18 ? t.cover.recipes.afternoon : t.cover.recipes.evening;
}

function Dish({ recipe, big = false }: { recipe: Recipe; big?: boolean }) {
  return (
    <div className={`rc-dish${big ? ' big' : ''}`} style={{ background: `linear-gradient(135deg, ${recipe.tone[0]}, ${recipe.tone[1]})` }} aria-hidden="true">
      <span>{recipe.emoji}</span>
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button className={`rc-save${saved ? ' on' : ''}`} onClick={onClick} aria-label={saved ? t.cover.recipes.unsave : t.cover.recipes.save} aria-pressed={saved}>
      <HeartIcon filled={saved} />
    </button>
  );
}

function Recipes({ onType }: { onType: OnType }) {
  const t = useT();
  const tr = t.cover.recipes;
  const recipes: Recipe[] = RECIPES.map((r) => ({ ...r, ...tr.items[r.id] }));
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [openId, setOpen] = useState<RecipeId | null>(null);
  const [saved, setSaved] = useState<string[]>(() => load('coverFavIds', ['shakshuka', 'banana-bread']));

  function toggleSave(id: RecipeId) {
    const next = saved.includes(id) ? saved.filter((n) => n !== id) : [...saved, id];
    setSaved(next);
    save('coverFavIds', next);
  }

  useEffect(() => window.scrollTo(0, 0), [openId]);

  const open = recipes.find((r) => r.id === openId);
  if (open) return <RecipeDetail recipe={open} saved={saved.includes(open.id)} onSave={() => toggleSave(open.id)} onBack={() => setOpen(null)} />;

  const needle = q.trim().toLowerCase();
  const list = recipes.filter(
    (r) =>
      (filter === 'All' || (filter === 'Saved' ? saved.includes(r.id) : filter === 'Quick' ? r.minutes <= 25 : r.category === filter)) &&
      (!needle || [r.name, tr.filters[r.category], ...r.ingredients].join(' ').toLowerCase().includes(needle)),
  );
  const browsing = !needle && filter === 'All';
  const pick = recipes[Math.floor(Date.now() / 864e5) % recipes.length];

  const card = (r: Recipe) => (
    <article key={r.id} className="rc-card">
      <button className="rc-open" onClick={() => setOpen(r.id)}>
        <Dish recipe={r} />
        <strong>{r.name}</strong>
        <span className="rc-meta">
          {tr.duration(r.minutes)} · {tr.levels[r.level]}
        </span>
      </button>
      <SaveButton saved={saved.includes(r.id)} onClick={() => toggleSave(r.id)} />
    </article>
  );

  return (
    <div className="rc">
      <div className="rc-hello">
        <span>{greeting(t)}</span>
        <h1>{tr.heading}</h1>
      </div>
      <SearchBar onType={onType} placeholder={tr.search} value={q} setValue={setQ} />
      <div className="rc-chips" role="tablist">
        {CATEGORIES.map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} className={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>
            {tr.filters[c]}
          </button>
        ))}
      </div>

      {browsing ? (
        <>
          <article className="rc-feature">
            <button className="rc-open" onClick={() => setOpen(pick.id)}>
              <Dish recipe={pick} big />
              <span className="rc-eyebrow">
                {tr.todaysPick} · {tr.filters[pick.category]}
              </span>
              <strong>{pick.name}</strong>
              <p>{pick.blurb}</p>
              <span className="rc-meta">
                {tr.duration(pick.minutes)} · {tr.serves(pick.serves)} · {tr.levels[pick.level]}
              </span>
            </button>
            <SaveButton saved={saved.includes(pick.id)} onClick={() => toggleSave(pick.id)} />
          </article>

          <section>
            <div className="rc-head">
              <h2>{tr.quick}</h2>
              <button onClick={() => setFilter('Quick')}>{tr.seeAll}</button>
            </div>
            <div className="rc-scroll">{recipes.filter((r) => r.minutes <= 25).map(card)}</div>
          </section>

          <section>
            <div className="rc-head">
              <h2>{tr.all}</h2>
              <span>{recipes.length}</span>
            </div>
            <div className="rc-grid">{recipes.map(card)}</div>
          </section>
        </>
      ) : (
        <section>
          <div className="rc-head">
            <h2>{needle ? tr.results : filter === 'Quick' ? tr.quick : tr.filters[filter]}</h2>
            <span>{tr.count(list.length)}</span>
          </div>
          {list.length > 0 ? (
            <div className="rc-grid">{list.map(card)}</div>
          ) : (
            <div className="cv-empty">
              <span aria-hidden="true">{filter === 'Saved' && !needle ? '🤍' : '🔍'}</span>
              <strong>{filter === 'Saved' && !needle ? tr.noSaved : tr.none}</strong>
              <p>{filter === 'Saved' && !needle ? tr.noSavedHint : tr.noneHint}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RecipeDetail({ recipe, saved, onSave, onBack }: { recipe: Recipe; saved: boolean; onSave: () => void; onBack: () => void }) {
  const tr = useT().cover.recipes;
  const [have, setHave] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setHave((s) => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <article className="rc rc-detail">
      <div className="rc-hero">
        <Dish recipe={recipe} big />
        <button className="rc-back" onClick={onBack} aria-label={tr.all}>
          <ChevronLeftIcon />
        </button>
        <SaveButton saved={saved} onClick={onSave} />
      </div>

      <header className="rc-title">
        <span className="rc-eyebrow">{tr.filters[recipe.category]}</span>
        <h1>{recipe.name}</h1>
        <p>{recipe.blurb}</p>
      </header>

      <dl className="rc-stats">
        <div>
          <ClockIcon />
          <dt>{tr.time}</dt>
          <dd>{tr.duration(recipe.minutes)}</dd>
        </div>
        <div>
          <UsersIcon />
          <dt>{tr.servesLabel}</dt>
          <dd>{recipe.serves}</dd>
        </div>
        <div>
          <FlameIcon />
          <dt>{tr.perServing}</dt>
          <dd>{recipe.kcal} kcal</dd>
        </div>
      </dl>

      <section>
        <div className="rc-head">
          <h2>{tr.ingredients}</h2>
          <span>
            {have.size}/{recipe.ingredients.length}
          </span>
        </div>
        <ul className="rc-ingredients">
          {recipe.ingredients.map((item, i) => (
            <li key={item}>
              <button className={have.has(i) ? 'on' : ''} onClick={() => toggle(i)} aria-pressed={have.has(i)}>
                <span className="rc-tick">{have.has(i) && <CheckIcon size={14} />}</span>
                {item}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="rc-head">
          <h2>{tr.method}</h2>
          <span>{tr.steps(recipe.steps.length)}</span>
        </div>
        <ol className="rc-steps">
          {recipe.steps.map((s, i) => (
            <li key={s}>
              <span className="rc-num">{i + 1}</span>
              <div>
                <strong>{tr.step(i + 1)}</strong>
                <p>{s}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="rc-tip">
        <strong>{tr.tip}</strong>
        <p>{recipe.tip}</p>
      </aside>
    </article>
  );
}

/* ---------- Notes ---------- */

interface Note {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  updated: number;
}

const DAY = 864e5;

// How long ago each example note was written; the first one is pinned.
const SEED_AGES = [2 * 36e5, DAY, 4 * DAY, 12 * DAY, 40 * DAY];

/** Example notes for a fresh cover, written in the app's language at the time. */
function seedNotes(t: Messages): Note[] {
  const now = Date.now();
  return t.cover.notes.seed.map((n, i) => ({ id: i + 1, ...n, pinned: i === 0, updated: now - SEED_AGES[i] }));
}

/** Loads saved notes, upgrading the older { id, text } format. */
function loadNotes(t: Messages): Note[] {
  const raw = load<Array<Partial<Note> & { text?: string }> | null>('coverNotes', null);
  if (!raw) return seedNotes(t);
  return raw.map((n) => {
    if (n.title !== undefined) return n as Note;
    const [title = '', ...rest] = (n.text ?? '').split('\n');
    return { id: n.id ?? Date.now(), title, body: rest.join('\n'), pinned: false, updated: n.id && n.id > 1e12 ? n.id : Date.now() - DAY };
  });
}

const isEmpty = (n: Note) => !n.title.trim() && !n.body.trim();
const titleOf = (n: Note, t: Messages) => n.title.trim() || n.body.trim().split('\n')[0] || t.cover.notes.newNote;
const previewOf = (n: Note, t: Messages) =>
  (n.title.trim() ? n.body : n.body.trim().split('\n').slice(1).join(' ')).trim().replace(/\s*\n\s*/g, ' ') || t.cover.notes.noText;

function shortDate(time: number, locale: string) {
  const d = new Date(time);
  const age = Date.now() - time;
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (age < 7 * DAY) return d.toLocaleDateString(locale, { weekday: 'long' });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: '2-digit' });
}

/** A key from cover.notes.groups, or a month name for older notes. */
function group(time: number, locale: string) {
  const d = new Date(time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (time >= today.getTime()) return 'today';
  if (time >= today.getTime() - DAY) return 'yesterday';
  if (time >= today.getTime() - 7 * DAY) return 'week';
  if (time >= today.getTime() - 30 * DAY) return 'month';
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function Notes({ onType }: { onType: OnType }) {
  const t = useT();
  const tn = t.cover.notes;
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(t));
  const [editing, setEditing] = useState<number | null>(null);

  function update(next: Note[]) {
    setNotes(next);
    save('coverNotes', next);
  }

  function compose() {
    const note: Note = { id: Date.now(), title: '', body: '', pinned: false, updated: Date.now() };
    setNotes([note, ...notes]); // kept out of storage until it has text
    setEditing(note.id);
  }

  function close() {
    update(notes.filter((n) => !isEmpty(n)));
    setEditing(null);
  }

  useEffect(() => window.scrollTo(0, 0), [editing]);

  const current = notes.find((n) => n.id === editing);
  if (current) {
    const change = (patch: Partial<Note>, touch = true) => {
      const next = notes.map((n) => (n.id === current.id ? { ...n, ...patch, ...(touch && { updated: Date.now() }) } : n));
      update(next.filter((n) => n.id === current.id || !isEmpty(n)));
    };
    return (
      <div className="nt nt-editor">
        <div className="nt-toolbar">
          <button className="nt-back" onClick={close}>
            <ChevronLeftIcon />
            {tn.back}
          </button>
          <div className="nt-actions">
            <button onClick={() => change({ pinned: !current.pinned }, false)} aria-label={current.pinned ? tn.unpin : tn.pin} aria-pressed={current.pinned} className={current.pinned ? 'on' : ''}>
              <PushpinIcon filled={current.pinned} />
            </button>
            <button onClick={() => (update(notes.filter((n) => n.id !== current.id)), setEditing(null))} aria-label={tn.delete}>
              <TrashIcon />
            </button>
            <button className="nt-done" onClick={close}>
              {tn.done}
            </button>
          </div>
        </div>
        <p className="nt-date">{new Date(current.updated).toLocaleString(t.locale, { dateStyle: 'long', timeStyle: 'short' })}</p>
        <input className="cv-field nt-title-input" placeholder={tn.title} value={current.title} autoFocus={isEmpty(current)} onChange={(e) => change({ title: e.target.value })} />
        <textarea className="nt-body-input" placeholder={tn.body} value={current.body} onChange={(e) => change({ body: e.target.value })} />
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const visible = notes
    .filter((n) => !isEmpty(n) && (!needle || `${n.title}\n${n.body}`.toLowerCase().includes(needle)))
    .sort((a, b) => b.updated - a.updated);

  // Pinned first, then grouped by date like a phone's notes app; search results stay in one list.
  const groups: [string, Note[]][] = [];
  const add = (name: string, n: Note) => {
    const g = groups.find(([k]) => k === name);
    g ? g[1].push(n) : groups.push([name, [n]]);
  };
  visible.forEach((n) => add(needle ? 'results' : n.pinned ? 'pinned' : group(n.updated, t.locale), n));
  groups.sort(([a], [b]) => Number(b === 'pinned') - Number(a === 'pinned'));

  const count = notes.filter((n) => !isEmpty(n)).length;

  return (
    <div className="nt">
      <SearchBar onType={onType} placeholder={tn.search} value={q} setValue={setQ} />
      {groups.map(([name, items]) => (
        <section key={name}>
          <h2 className="nt-group">
            {name === 'pinned' && <PushpinIcon filled />}
            {tn.groups[name] ?? name}
          </h2>
          <ul className="nt-list">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => setEditing(n.id)}>
                  <strong>{titleOf(n, t)}</strong>
                  <span>
                    <time>{shortDate(n.updated, t.locale)}</time> {previewOf(n, t)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {visible.length === 0 && (
        <div className="cv-empty">
          <span aria-hidden="true">📝</span>
          <strong>{needle ? tn.noResults : tn.noNotes}</strong>
          <p>{needle ? tn.noResultsHint : tn.noNotesHint}</p>
        </div>
      )}
      <footer className="nt-footer">
        <span>{tn.count(count)}</span>
        <button onClick={compose} aria-label={tn.newNote}>
          <ComposeIcon />
        </button>
      </footer>
    </div>
  );
}

/* ---------- Memory game ---------- */

const FACES = ['🍎', '🍌', '🍇', '🍒', '🍋', '🥝', '🍑', '🍉'];

function newDeck() {
  const deck = [...FACES, ...FACES];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function Game({ onType }: { onType: OnType }) {
  const tg = useT().cover.game;
  const [deck, setDeck] = useState(newDeck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [code, setCode] = useState('');
  const [best, setBest] = useState<number | null>(() => load('coverBest', null));
  const won = matched.size === deck.length;

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped;
    const t = setTimeout(
      () => {
        if (deck[a] === deck[b]) setMatched((m) => new Set([...m, a, b]));
        setFlipped([]);
      },
      deck[a] === deck[b] ? 250 : 700,
    );
    return () => clearTimeout(t);
  }, [flipped, deck]);

  useEffect(() => {
    if (won && (best == null || moves < best)) {
      setBest(moves);
      save('coverBest', moves);
    }
  }, [won]);

  function flip(i: number) {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(i)) return;
    if (flipped.length === 1) setMoves((m) => m + 1);
    setFlipped([...flipped, i]);
  }

  function restart() {
    setDeck(newDeck());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
  }

  return (
    <>
      <div className="row between">
        <span>
          {tg.moves} <strong>{moves}</strong>
          {best != null && (
            <span className="muted">
              {' '}
              · {tg.best} {best}
            </span>
          )}
        </span>
        <button className="button small" onClick={restart}>
          {tg.newGame}
        </button>
      </div>
      {won && <p className="card">{tg.won(moves)}</p>}
      <div className="memory">
        {deck.map((face, i) => {
          const up = flipped.includes(i) || matched.has(i);
          return (
            <button key={i} className={`memory-card${up ? ' up' : ''}${matched.has(i) ? ' matched' : ''}`} onClick={() => flip(i)} aria-label={up ? face : tg.hidden}>
              {up ? face : ''}
            </button>
          );
        })}
      </div>
      <label className="muted">
        {tg.bonus}
        <SecretInput onType={onType} placeholder={tg.bonusPlaceholder} value={code} setValue={setCode} />
      </label>
    </>
  );
}
