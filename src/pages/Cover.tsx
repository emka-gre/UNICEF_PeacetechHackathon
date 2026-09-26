import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COVERS, getCode, getCover, tryUnlock, unlockWithoutCode, useDiscreet } from '../lib/safety';
import { CheckIcon, ChevronLeftIcon, ClockIcon, ComposeIcon, FlameIcon, GearIcon, HeartIcon, PushpinIcon, SearchIcon, TrashIcon, UsersIcon } from '../icons';
import { load, save } from '../lib/storage';
import '../cover.css';

// The fake app shown in discreet mode. Each cover really works, so it holds up if someone
// looks through it. Typing the secret code in its search / code box opens the real app.
export default function Cover() {
  useDiscreet(); // re-render when the cover choice changes
  const cover = getCover();
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
          {COVERS[cover].name}
        </span>
        <button className="gear cover-gear" onClick={openSettings} aria-label="Settings">
          <GearIcon />
        </button>
      </header>
      <main className="stack">
        {asking && getCode() && (
          <form className="card stack" onSubmit={submitPass}>
            <strong>Settings are locked</strong>
            <label>
              Passcode
              <input type="password" value={pass} autoFocus autoComplete="off" onChange={(e) => (setPass(e.target.value), setWrong(false))} />
            </label>
            {wrong && <p className="error">Wrong passcode.</p>}
            <div className="row">
              <button className="button small">Open</button>
              <button type="button" className="button small ghost" onClick={() => (setAsking(false), setPass(''), setWrong(false))}>
                Cancel
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

interface Recipe {
  name: string;
  category: Category;
  minutes: number;
  serves: number;
  level: 'Easy' | 'Medium';
  kcal: number;
  emoji: string;
  tone: [string, string];
  blurb: string;
  ingredients: string[];
  steps: string[];
  tip: string;
}

const RECIPES: Recipe[] = [
  {
    name: 'Red lentil soup',
    category: 'Soups',
    minutes: 35,
    serves: 4,
    level: 'Easy',
    kcal: 280,
    emoji: '🍲',
    tone: ['#f6c28b', '#e0793f'],
    blurb: 'Silky, warming and made almost entirely from the cupboard. A squeeze of lemon at the end makes it sing.',
    ingredients: ['1 cup red lentils, rinsed', '1 onion, chopped', '1 carrot, grated', '2 tsp ground cumin', '1 L vegetable stock', 'Juice of 1 lemon', 'Olive oil, salt'],
    steps: ['Soften the onion in a little oil over a medium heat, about 5 minutes.', 'Add the carrot, cumin and lentils and stir for 1 minute.', 'Pour in the stock, bring to the boil and simmer for 25 minutes.', 'Blend until smooth, then add the lemon juice and salt to taste.'],
    tip: 'Top with a spoon of yoghurt and a pinch of chilli flakes.',
  },
  {
    name: 'Shakshuka',
    category: 'Breakfast',
    minutes: 25,
    serves: 2,
    level: 'Easy',
    kcal: 340,
    emoji: '🍳',
    tone: ['#f7a58a', '#d2452f'],
    blurb: 'Eggs gently poached in a smoky pepper and tomato sauce. Serve straight from the pan with warm bread.',
    ingredients: ['4 eggs', '1 tin chopped tomatoes', '1 red pepper, sliced', '1 onion, sliced', '2 garlic cloves', '1 tsp smoked paprika', 'Fresh parsley'],
    steps: ['Fry the onion, pepper and garlic until soft, about 8 minutes.', 'Add the tomatoes and paprika and simmer for 10 minutes.', 'Make 4 wells in the sauce and crack in the eggs.', 'Cover and cook until the whites are set but the yolks still soft.'],
    tip: 'A little crumbled feta on top is never a bad idea.',
  },
  {
    name: 'Banana bread',
    category: 'Baking',
    minutes: 70,
    serves: 8,
    level: 'Easy',
    kcal: 310,
    emoji: '🍌',
    tone: ['#fbe29a', '#e3a63c'],
    blurb: 'The best use for brown bananas. Moist, fragrant and even better the next day.',
    ingredients: ['3 very ripe bananas', '75 g butter, melted', '150 g sugar', '1 egg, beaten', '190 g plain flour', '1 tsp baking soda', 'Pinch of salt'],
    steps: ['Heat the oven to 175 °C and line a loaf tin.', 'Mash the bananas and mix in the butter, sugar and egg.', 'Fold in the flour, baking soda and salt until just combined.', 'Bake for 55–60 minutes, until a skewer comes out clean.'],
    tip: 'Add a handful of chopped walnuts or chocolate chips with the flour.',
  },
  {
    name: 'Tabbouleh',
    category: 'Salads',
    minutes: 20,
    serves: 4,
    level: 'Easy',
    kcal: 190,
    emoji: '🥗',
    tone: ['#c8e6a0', '#6fa74a'],
    blurb: 'A fresh, herb-packed salad where parsley is the star, not the garnish.',
    ingredients: ['½ cup fine bulgur', '2 bunches flat-leaf parsley', '1 bunch mint', '3 ripe tomatoes', '1 lemon', '4 tbsp olive oil', 'Salt'],
    steps: ['Soak the bulgur in boiling water for 10 minutes, then drain well.', 'Finely chop the herbs and dice the tomatoes.', 'Mix everything with the lemon juice, oil and salt.'],
    tip: 'Chop the herbs with a very sharp knife so they stay bright green.',
  },
  {
    name: 'Chicken and rice',
    category: 'Mains',
    minutes: 45,
    serves: 4,
    level: 'Medium',
    kcal: 520,
    emoji: '🍗',
    tone: ['#f5d38a', '#c98a2b'],
    blurb: 'Golden turmeric rice cooked in one pot with tender chicken thighs. Comfort food for a busy evening.',
    ingredients: ['4 chicken thighs', '1½ cups rice', '1 onion, chopped', '1 tsp turmeric', '3 cups chicken stock', 'Handful of peas'],
    steps: ['Brown the chicken on both sides, then set aside.', 'Fry the onion and turmeric, add the rice and stir to coat.', 'Add the stock and chicken, cover and simmer for 20 minutes.', 'Stir in the peas, turn off the heat and rest for 5 minutes.'],
    tip: 'Rinse the rice until the water runs clear for fluffier grains.',
  },
  {
    name: 'Fluffy pancakes',
    category: 'Breakfast',
    minutes: 20,
    serves: 3,
    level: 'Easy',
    kcal: 260,
    emoji: '🥞',
    tone: ['#f9dcb0', '#d99a4e'],
    blurb: 'Weekend-morning pancakes, thick and soft. The batter comes together in two minutes.',
    ingredients: ['200 g plain flour', '2 eggs', '300 ml milk', '1 tbsp sugar', '2 tsp baking powder', 'Pinch of salt', 'Butter for the pan'],
    steps: ['Whisk everything into a smooth, thick batter.', 'Leave to rest for 5 minutes.', 'Cook ladlefuls in a buttered pan for 1–2 minutes on each side.'],
    tip: 'Flip when bubbles appear on the surface and the edges look set.',
  },
  {
    name: 'Chickpea curry',
    category: 'Mains',
    minutes: 40,
    serves: 4,
    level: 'Medium',
    kcal: 410,
    emoji: '🍛',
    tone: ['#f7c77a', '#d0772a'],
    blurb: 'Creamy coconut curry with chickpeas and spinach. Mild enough for everyone at the table.',
    ingredients: ['2 tins chickpeas, drained', '1 tin coconut milk', '1 onion', '3 garlic cloves', 'Thumb of ginger', '2 tbsp curry powder', '2 handfuls spinach'],
    steps: ['Fry the onion until golden, then add the garlic and ginger.', 'Stir in the curry powder and cook for 1 minute.', 'Add the chickpeas and coconut milk and simmer for 15 minutes.', 'Wilt in the spinach and season to taste.'],
    tip: 'Serve with rice or warm flatbread and a wedge of lime.',
  },
  {
    name: 'Village salad',
    category: 'Salads',
    minutes: 15,
    serves: 2,
    level: 'Easy',
    kcal: 230,
    emoji: '🍅',
    tone: ['#f8b4a4', '#d9534f'],
    blurb: 'Tomatoes, cucumber and feta with good olive oil. No lettuce needed.',
    ingredients: ['4 ripe tomatoes', '1 cucumber', '½ red onion', '100 g feta', 'Handful of olives', '1 tsp dried oregano', '3 tbsp olive oil'],
    steps: ['Cut the tomatoes and cucumber into large chunks.', 'Slice the onion thinly and add the olives.', 'Top with the feta, oregano and olive oil.'],
    tip: 'Salt the tomatoes 10 minutes ahead to draw out their juices.',
  },
  {
    name: 'Lemon drizzle cake',
    category: 'Baking',
    minutes: 55,
    serves: 10,
    level: 'Medium',
    kcal: 330,
    emoji: '🍋',
    tone: ['#fff1a6', '#e4c23a'],
    blurb: 'A light sponge soaked in a sharp lemon syrup, with a crackly sugar top.',
    ingredients: ['225 g butter, soft', '225 g caster sugar', '4 eggs', '225 g self-raising flour', 'Zest of 2 lemons', 'Juice of 1½ lemons', '85 g sugar for the drizzle'],
    steps: ['Heat the oven to 180 °C and line a loaf tin.', 'Beat the butter and sugar until pale, then beat in the eggs.', 'Fold in the flour and zest and bake for 45 minutes.', 'Mix the lemon juice and sugar and pour over the warm cake.'],
    tip: 'Prick the cake all over with a fork so the syrup soaks in.',
  },
  {
    name: 'Tomato basil pasta',
    category: 'Mains',
    minutes: 25,
    serves: 4,
    level: 'Easy',
    kcal: 450,
    emoji: '🍝',
    tone: ['#f6b08e', '#c7502d'],
    blurb: 'A quick, glossy tomato sauce that is ready by the time the pasta is cooked.',
    ingredients: ['400 g spaghetti', '2 tins chopped tomatoes', '3 garlic cloves', '4 tbsp olive oil', 'Handful of basil', 'Parmesan to serve'],
    steps: ['Cook the pasta in well-salted water.', 'Gently fry the garlic in the oil, add the tomatoes and simmer 15 minutes.', 'Toss the pasta with the sauce and a splash of pasta water.', 'Tear over the basil and finish with Parmesan.'],
    tip: 'A spoon of the starchy pasta water makes the sauce cling.',
  },
];

const CATEGORIES = ['All', 'Saved', 'Quick', 'Breakfast', 'Soups', 'Mains', 'Salads', 'Baking'] as const;
type Filter = (typeof CATEGORIES)[number];

const duration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Dish({ recipe, big = false }: { recipe: Recipe; big?: boolean }) {
  return (
    <div className={`rc-dish${big ? ' big' : ''}`} style={{ background: `linear-gradient(135deg, ${recipe.tone[0]}, ${recipe.tone[1]})` }} aria-hidden="true">
      <span>{recipe.emoji}</span>
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button className={`rc-save${saved ? ' on' : ''}`} onClick={onClick} aria-label={saved ? 'Remove from saved' : 'Save recipe'} aria-pressed={saved}>
      <HeartIcon filled={saved} />
    </button>
  );
}

function Recipes({ onType }: { onType: OnType }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [open, setOpen] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState<string[]>(() => load('coverFavs', ['Shakshuka', 'Banana bread']));

  function toggleSave(name: string) {
    const next = saved.includes(name) ? saved.filter((n) => n !== name) : [...saved, name];
    setSaved(next);
    save('coverFavs', next);
  }

  useEffect(() => window.scrollTo(0, 0), [open]);

  if (open) return <RecipeDetail recipe={open} saved={saved.includes(open.name)} onSave={() => toggleSave(open.name)} onBack={() => setOpen(null)} />;

  const needle = q.trim().toLowerCase();
  const list = RECIPES.filter(
    (r) =>
      (filter === 'All' || (filter === 'Saved' ? saved.includes(r.name) : filter === 'Quick' ? r.minutes <= 25 : r.category === filter)) &&
      (!needle || [r.name, r.category, ...r.ingredients].join(' ').toLowerCase().includes(needle)),
  );
  const browsing = !needle && filter === 'All';
  const pick = RECIPES[Math.floor(Date.now() / 864e5) % RECIPES.length];

  const card = (r: Recipe) => (
    <article key={r.name} className="rc-card">
      <button className="rc-open" onClick={() => setOpen(r)}>
        <Dish recipe={r} />
        <strong>{r.name}</strong>
        <span className="rc-meta">
          {duration(r.minutes)} · {r.level}
        </span>
      </button>
      <SaveButton saved={saved.includes(r.name)} onClick={() => toggleSave(r.name)} />
    </article>
  );

  return (
    <div className="rc">
      <div className="rc-hello">
        <span>{greeting()}</span>
        <h1>What would you like to cook today?</h1>
      </div>
      <SearchBar onType={onType} placeholder="Search recipes or ingredients" value={q} setValue={setQ} />
      <div className="rc-chips" role="tablist">
        {CATEGORIES.map((c) => (
          <button key={c} role="tab" aria-selected={filter === c} className={filter === c ? 'on' : ''} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {browsing ? (
        <>
          <article className="rc-feature">
            <button className="rc-open" onClick={() => setOpen(pick)}>
              <Dish recipe={pick} big />
              <span className="rc-eyebrow">Today’s pick · {pick.category}</span>
              <strong>{pick.name}</strong>
              <p>{pick.blurb}</p>
              <span className="rc-meta">
                {duration(pick.minutes)} · Serves {pick.serves} · {pick.level}
              </span>
            </button>
            <SaveButton saved={saved.includes(pick.name)} onClick={() => toggleSave(pick.name)} />
          </article>

          <section>
            <div className="rc-head">
              <h2>Ready in 25 minutes</h2>
              <button onClick={() => setFilter('Quick')}>See all</button>
            </div>
            <div className="rc-scroll">{RECIPES.filter((r) => r.minutes <= 25).map(card)}</div>
          </section>

          <section>
            <div className="rc-head">
              <h2>All recipes</h2>
              <span>{RECIPES.length}</span>
            </div>
            <div className="rc-grid">{RECIPES.map(card)}</div>
          </section>
        </>
      ) : (
        <section>
          <div className="rc-head">
            <h2>{needle ? 'Results' : filter === 'Quick' ? 'Ready in 25 minutes' : filter}</h2>
            <span>
              {list.length} {list.length === 1 ? 'recipe' : 'recipes'}
            </span>
          </div>
          {list.length > 0 ? (
            <div className="rc-grid">{list.map(card)}</div>
          ) : (
            <div className="cv-empty">
              <span aria-hidden="true">{filter === 'Saved' && !needle ? '🤍' : '🔍'}</span>
              <strong>{filter === 'Saved' && !needle ? 'No saved recipes yet' : 'No recipes found'}</strong>
              <p>{filter === 'Saved' && !needle ? 'Tap the heart on a recipe to keep it here.' : 'Try another ingredient or dish name.'}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RecipeDetail({ recipe, saved, onSave, onBack }: { recipe: Recipe; saved: boolean; onSave: () => void; onBack: () => void }) {
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
        <button className="rc-back" onClick={onBack} aria-label="All recipes">
          <ChevronLeftIcon />
        </button>
        <SaveButton saved={saved} onClick={onSave} />
      </div>

      <header className="rc-title">
        <span className="rc-eyebrow">{recipe.category}</span>
        <h1>{recipe.name}</h1>
        <p>{recipe.blurb}</p>
      </header>

      <dl className="rc-stats">
        <div>
          <ClockIcon />
          <dt>Time</dt>
          <dd>{duration(recipe.minutes)}</dd>
        </div>
        <div>
          <UsersIcon />
          <dt>Serves</dt>
          <dd>{recipe.serves}</dd>
        </div>
        <div>
          <FlameIcon />
          <dt>Per serving</dt>
          <dd>{recipe.kcal} kcal</dd>
        </div>
      </dl>

      <section>
        <div className="rc-head">
          <h2>Ingredients</h2>
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
          <h2>Method</h2>
          <span>{recipe.steps.length} steps</span>
        </div>
        <ol className="rc-steps">
          {recipe.steps.map((s, i) => (
            <li key={s}>
              <span className="rc-num">{i + 1}</span>
              <div>
                <strong>Step {i + 1}</strong>
                <p>{s}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="rc-tip">
        <strong>Cook’s tip</strong>
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

function seedNotes(): Note[] {
  const now = Date.now();
  return [
    { id: 1, title: 'Shopping list', body: 'Milk\nBread\nTomatoes\nRice\nOnions\nOlive oil', pinned: true, updated: now - 2 * 36e5 },
    { id: 2, title: 'Dentist', body: 'Call on Tuesday morning to move the appointment.\nAsk how much the cleaning costs.', pinned: false, updated: now - DAY },
    { id: 3, title: 'Birthday ideas for Mum', body: 'Scarf (blue or green)\nPhoto frame for the kitchen\nCake from the bakery near the market', pinned: false, updated: now - 4 * DAY },
    { id: 4, title: 'Book club – October', body: 'Reading: The Secret Garden\nMeet at Sara’s on the 14th, bring biscuits', pinned: false, updated: now - 12 * DAY },
    { id: 5, title: 'Plants', body: 'Water the basil every two days\nRepot the small one in spring', pinned: false, updated: now - 40 * DAY },
  ];
}

/** Loads saved notes, upgrading the older { id, text } format. */
function loadNotes(): Note[] {
  const raw = load<Array<Partial<Note> & { text?: string }> | null>('coverNotes', null);
  if (!raw) return seedNotes();
  return raw.map((n) => {
    if (n.title !== undefined) return n as Note;
    const [title = '', ...rest] = (n.text ?? '').split('\n');
    return { id: n.id ?? Date.now(), title, body: rest.join('\n'), pinned: false, updated: n.id && n.id > 1e12 ? n.id : Date.now() - DAY };
  });
}

const isEmpty = (n: Note) => !n.title.trim() && !n.body.trim();
const titleOf = (n: Note) => n.title.trim() || n.body.trim().split('\n')[0] || 'New note';
const previewOf = (n: Note) => (n.title.trim() ? n.body : n.body.trim().split('\n').slice(1).join(' ')).trim().replace(/\s*\n\s*/g, ' ') || 'No additional text';

function shortDate(t: number) {
  const d = new Date(t);
  const age = Date.now() - t;
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (age < 7 * DAY) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: '2-digit' });
}

function group(t: number) {
  const d = new Date(t);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (t >= today.getTime()) return 'Today';
  if (t >= today.getTime() - DAY) return 'Yesterday';
  if (t >= today.getTime() - 7 * DAY) return 'Previous 7 days';
  if (t >= today.getTime() - 30 * DAY) return 'Previous 30 days';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function Notes({ onType }: { onType: OnType }) {
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState<Note[]>(loadNotes);
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
            Notes
          </button>
          <div className="nt-actions">
            <button onClick={() => change({ pinned: !current.pinned }, false)} aria-label={current.pinned ? 'Unpin' : 'Pin'} aria-pressed={current.pinned} className={current.pinned ? 'on' : ''}>
              <PushpinIcon filled={current.pinned} />
            </button>
            <button onClick={() => (update(notes.filter((n) => n.id !== current.id)), setEditing(null))} aria-label="Delete note">
              <TrashIcon />
            </button>
            <button className="nt-done" onClick={close}>
              Done
            </button>
          </div>
        </div>
        <p className="nt-date">{new Date(current.updated).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
        <input className="cv-field nt-title-input" placeholder="Title" value={current.title} autoFocus={isEmpty(current)} onChange={(e) => change({ title: e.target.value })} />
        <textarea className="nt-body-input" placeholder="Start writing…" value={current.body} onChange={(e) => change({ body: e.target.value })} />
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
  visible.forEach((n) => add(needle ? 'Results' : n.pinned ? 'Pinned' : group(n.updated), n));
  groups.sort(([a], [b]) => Number(b === 'Pinned') - Number(a === 'Pinned'));

  const count = notes.filter((n) => !isEmpty(n)).length;

  return (
    <div className="nt">
      <SearchBar onType={onType} placeholder="Search" value={q} setValue={setQ} />
      {groups.map(([name, items]) => (
        <section key={name}>
          <h2 className="nt-group">
            {name === 'Pinned' && <PushpinIcon filled />}
            {name}
          </h2>
          <ul className="nt-list">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => setEditing(n.id)}>
                  <strong>{titleOf(n)}</strong>
                  <span>
                    <time>{shortDate(n.updated)}</time> {previewOf(n)}
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
          <strong>{needle ? 'No results' : 'No notes'}</strong>
          <p>{needle ? 'Try a different word.' : 'Tap the pencil to write your first note.'}</p>
        </div>
      )}
      <footer className="nt-footer">
        <span>
          {count} {count === 1 ? 'note' : 'notes'}
        </span>
        <button onClick={compose} aria-label="New note">
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
          Moves: <strong>{moves}</strong>
          {best != null && <span className="muted"> · Best: {best}</span>}
        </span>
        <button className="button small" onClick={restart}>
          New game
        </button>
      </div>
      {won && <p className="card">You found all the pairs in {moves} moves!</p>}
      <div className="memory">
        {deck.map((face, i) => {
          const up = flipped.includes(i) || matched.has(i);
          return (
            <button key={i} className={`memory-card${up ? ' up' : ''}${matched.has(i) ? ' matched' : ''}`} onClick={() => flip(i)} aria-label={up ? face : 'Hidden card'}>
              {up ? face : ''}
            </button>
          );
        })}
      </div>
      <label className="muted">
        Bonus code
        <SecretInput onType={onType} placeholder="Enter a bonus code" value={code} setValue={setCode} />
      </label>
    </>
  );
}
