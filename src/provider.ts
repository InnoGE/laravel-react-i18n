import { useEffect, useState } from 'react';

import type I18nProviderProps from './interfaces/i18n-provider-props.js';
import { configure, getSnapshot, setLocale } from './store.js';

/**
 * Laravel React I18n Provider: configures the shared store on its first render.
 */
export default function LaravelReactI18nProvider({ children, ssr, ...options }: I18nProviderProps) {
  // Runs during the first render (also on the server), so eager translations are there before any child renders.
  useState(() => configure(options));

  useEffect(() => {
    if (options.locale && options.locale !== getSnapshot().locale) {
      void setLocale(options.locale);
    }
  }, [options.locale]);

  return children;
}
