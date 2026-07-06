import { en } from './en';
import { de } from './de';

export type Lang = 'en' | 'de';
export type Key = keyof typeof en;

const tables: Record<Lang, Record<Key, string>> = { en, de };

let current: Lang = 'en';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function t(key: Key): string {
  return tables[current][key];
}
