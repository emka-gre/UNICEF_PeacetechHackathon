import { useSyncExternalStore } from 'react';
import { load, save } from '../lib/storage';
import { en, type Messages } from './en';
import { uk } from './uk';
import { pl } from './pl';

// To add a language: copy en.ts, translate it, and list it here. TypeScript flags any missing key.
export const LANGS = { en, uk, pl } as const satisfies Record<string, Messages>;
export type Lang = keyof typeof LANGS;
export type { Messages };

function isLang(l: unknown): l is Lang {
  return typeof l === 'string' && l in LANGS;
}

/** A saved choice wins; otherwise the first phone language we support; otherwise English. */
function detect(): Lang {
  const saved = load<string | null>('lang', null);
  if (isLang(saved)) return saved;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

let current: Lang = detect();
const listeners = new Set<() => void>();
document.documentElement.lang = current;

export function getLang(): Lang {
  return current;
}

/** For code outside React components (errors thrown from lib/, the page title). */
export function getT(): Messages {
  return LANGS[current];
}

export function setLang(lang: Lang) {
  current = lang;
  save('lang', lang);
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function useLang(): Lang {
  return useSyncExternalStore(onLangChange, getLang);
}

export function useT(): Messages {
  return LANGS[useLang()];
}

/** Server data (partners, guides, helplines) can carry translated fields; English is the fallback. */
export function localize<T extends { translations?: Record<string, Partial<T>> }>(item: T, lang: Lang): T {
  return { ...item, ...item.translations?.[lang] };
}
