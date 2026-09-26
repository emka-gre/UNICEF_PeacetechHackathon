import { useEffect, useState } from 'react';
import { load, save } from './storage';

const NEUTRAL_PAGE = 'https://www.bbc.com/weather';

/** Leave immediately. `replace` keeps this app out of the back-button history.
 *  In discreet mode the cover app is already a safe screen, so we just lock and show it. */
export function quickExit() {
  if (load('discreet', false)) {
    lock();
    window.history.replaceState(null, '', '/');
    return;
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  document.body.innerHTML = '';
  window.location.replace(NEUTRAL_PAGE);
}

const listeners = new Set<(on: boolean) => void>();

export function setDiscreet(on: boolean) {
  save('discreet', on);
  if (on) lock();
  applyDiscreet(on);
  listeners.forEach((fn) => fn(on));
}

/** The fake app shown in discreet mode. The real app is behind the secret code. */
export type Cover = 'recipes' | 'notes' | 'game';

export const COVERS: Record<Cover, { name: string; icon: string; hint: string }> = {
  recipes: { name: 'Recipes', icon: '/recipes.svg', hint: 'type your code in the recipe search box' },
  notes: { name: 'Notes', icon: '/notes.svg', hint: 'type your code in the notes search box' },
  game: { name: 'Memory', icon: '/game.svg', hint: 'type your code in the "Bonus code" box under the game' },
};

export function getCover(): Cover {
  const c = load<Cover>('cover', 'recipes');
  return c in COVERS ? c : 'recipes';
}

export function setCover(c: Cover) {
  save('cover', c);
  applyDiscreet(load('discreet', false));
  listeners.forEach((fn) => fn(load('discreet', false)));
}

export function getCode(): string {
  return load('code', '');
}

/** An empty code is allowed: the cover then opens with a long press on its title. */
export function setCode(code: string) {
  save('code', code);
}

export function applyDiscreet(on: boolean) {
  const cover = COVERS[getCover()];
  document.title = on ? cover.name : 'Laaha';
  document.getElementById('favicon')?.setAttribute('href', on ? cover.icon : '/icon.svg');
}

// Unlocked state lives in sessionStorage, so closing the app locks it again.
const lockListeners = new Set<(unlocked: boolean) => void>();

function isUnlocked() {
  try {
    return sessionStorage.getItem('laaha.unlocked') === '1';
  } catch {
    return false;
  }
}

function setUnlocked(on: boolean) {
  try {
    if (on) sessionStorage.setItem('laaha.unlocked', '1');
    else sessionStorage.removeItem('laaha.unlocked');
  } catch {
    /* ignore */
  }
  lockListeners.forEach((fn) => fn(on));
}

export function lock() {
  setUnlocked(false);
}

/** Returns true (and opens the real app) when `attempt` is the secret code. */
export function tryUnlock(attempt: string): boolean {
  const code = getCode();
  if (!code || attempt.trim().toLowerCase() !== code.toLowerCase()) return false;
  setUnlocked(true);
  return true;
}

/** Without a code, a long press on the cover title opens the real app. */
export function unlockWithoutCode(): boolean {
  if (getCode()) return false;
  setUnlocked(true);
  return true;
}

// Lock again after the phone has been away from the app for a while
// (short enough to be safe, long enough to send an SMS from the SOS page and come back).
const AWAY_LIMIT_MS = 60_000;
let hiddenAt = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > AWAY_LIMIT_MS) lock();
  });
}

export function useUnlocked() {
  const [on, setOn] = useState(isUnlocked);
  useEffect(() => {
    lockListeners.add(setOn);
    return () => void lockListeners.delete(setOn);
  }, []);
  return on;
}

export function useDiscreet() {
  const [on, setOn] = useState(() => load('discreet', false));
  useEffect(() => {
    applyDiscreet(on);
    listeners.add(setOn);
    return () => void listeners.delete(setOn);
  }, []);
  return on;
}

/** Double Esc = quick exit, for laptops. */
export function useQuickExitShortcut() {
  useEffect(() => {
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      if (now - last < 600) quickExit();
      last = now;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
