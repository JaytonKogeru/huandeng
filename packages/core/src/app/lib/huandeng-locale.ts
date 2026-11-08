import { useSyncExternalStore } from 'react';
import {
  formatUiDate,
  formatUiNumber,
  normalizeUiLocale,
  translateUi,
  type UiLocale,
  type UiValues,
} from '../../locale/huandeng';

const storageKey = 'huandeng:ui-locale';
const listeners = new Set<() => void>();
let current: UiLocale = readBrowserLocale();
let desktopReady = false;

function readBrowserLocale(): UiLocale {
  try {
    const stored = normalizeUiLocale(localStorage.getItem(storageKey));
    if (stored) return stored;
  } catch {}
  return 'en';
}

export function getUiLocale(): UiLocale {
  return current;
}

export function subscribeUiLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyLocale(locale: UiLocale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
  if (current === locale) return;
  current = locale;
  for (const listener of listeners) listener();
}

export async function initializeUiLocale(): Promise<void> {
  const desktop = typeof window === 'undefined' ? undefined : window.huandengDesktop;
  if (desktop?.getLocale) {
    applyLocale(await desktop.getLocale());
    if (!desktopReady) {
      desktop.onLocaleChanged?.(applyLocale);
      desktopReady = true;
    }
  } else applyLocale(readBrowserLocale());
}

export async function setUiLocale(locale: UiLocale): Promise<void> {
  if (locale !== 'en' && locale !== 'zh-CN') throw new Error('Unsupported interface language.');
  const desktop = typeof window === 'undefined' ? undefined : window.huandengDesktop;
  if (desktop?.setLocale) {
    applyLocale(await desktop.setLocale(locale));
  } else {
    localStorage.setItem(storageKey, locale);
    applyLocale(locale);
  }
}

export function uiText(message: string, values?: UiValues): string {
  return translateUi(current, message, values);
}

const locales = {
  en: {
    locale: 'en' as const,
    t: (message: string, values?: UiValues) => translateUi('en', message, values),
    date: (value: string | number | Date) => formatUiDate('en', value),
    number: (value: number) => formatUiNumber('en', value),
    setLocale: setUiLocale,
  },
  'zh-CN': {
    locale: 'zh-CN' as const,
    t: (message: string, values?: UiValues) => translateUi('zh-CN', message, values),
    date: (value: string | number | Date) => formatUiDate('zh-CN', value),
    number: (value: number) => formatUiNumber('zh-CN', value),
    setLocale: setUiLocale,
  },
};

export function useHuandengLocale() {
  return locales[useSyncExternalStore(subscribeUiLocale, getUiLocale, getUiLocale)];
}
