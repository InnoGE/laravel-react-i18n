import useLaravelReactI18n from './hook.js';
import LaravelReactI18nProvider from './provider.js';

export type { LaravelReactI18n } from './hook.js';
export type { default as ReplacementsInterface } from './interfaces/replacements.js';
export { getActiveLanguage, getLocales, isLocale, setLocale, trans, transChoice } from './store.js';
export { LaravelReactI18nProvider, useLaravelReactI18n };
