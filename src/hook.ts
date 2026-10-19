import { useMemo, useSyncExternalStore } from 'react';

import type ReplacementsInterface from './interfaces/replacements.js';
import {
  activeLocale,
  getLocales,
  getSnapshot,
  isLocale,
  setLocale,
  subscribe,
  translate,
  translateChoice
} from './store.js';

export interface LaravelReactI18n<T extends string = string> {
  currentLocale: () => string;
  getLocales: () => string[];
  isLocale: (locale: string) => boolean;
  loading: boolean;
  setLocale: (locale: string) => Promise<void>;
  t: (key: T, replacements?: ReplacementsInterface) => string;
  tChoice: (key: T, number: number, replacements?: ReplacementsInterface) => string;
}

export default function useLaravelReactI18n<T extends string = string>(): LaravelReactI18n<T> {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Bound to this render's snapshot, and new per state so memoized consumers re-render on a locale change.
  return useMemo(
    () => ({
      t: (key, replacements) => translate(state, key, replacements),
      tChoice: (key, number, replacements) => translateChoice(state, key, number, replacements),
      loading: state.loading,
      currentLocale: () => activeLocale(state),
      setLocale,
      getLocales,
      isLocale
    }),
    [state]
  );
}
