import type LocaleFileInterface from './interfaces/locale-file.js';
import type OptionsInterface from './interfaces/options.js';
import type ReplacementsInterface from './interfaces/replacements.js';
import pluralization from './utils/pluralization.js';
import recognizer from './utils/recognizer.js';
import replacer from './utils/replacer.js';
import resolver from './utils/resolver.js';

type Files = OptionsInterface['files'];

export interface I18nState {
  locale: string;
  fallbackLocale: string;
  loading: boolean;
}

/**
 * One module-level store instead of provider state: `trans()` works outside components, and a
 * finished load notifies every subscriber, so nothing waits for an unrelated re-render to show up.
 *
 * ponytail: one store per process. Fine in the browser and with synchronous `renderToString`;
 * streaming SSR with several locales needs a per-render store passed through context.
 */
const translations = new Map<string, Record<string, string>>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

let files: Files = {};
let locales = recognizer(files);
let state: I18nState = initialState();

// Only the locale the latest setLocale() asked for may be applied once its files arrive.
let requested = state.locale;

function initialState(): I18nState {
  const documentLang = typeof document !== 'undefined' ? document.documentElement.lang.replace('-', '_') || 'en' : 'en';

  return { locale: documentLang, fallbackLocale: documentLang, loading: false };
}

function update(next: Partial<I18nState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function getSnapshot(): I18nState {
  return state;
}

function store(locale: string, responses: LocaleFileInterface[]): void {
  translations.set(
    locale,
    Object.assign({}, translations.get(locale), ...responses.map((response) => response.default))
  );
}

/** Eager files load synchronously; lazy ones return the pending import, shared by concurrent callers. */
function load(locale: string): Promise<void> | void {
  if (translations.has(locale) || !locales.isLocale(locale)) {
    return;
  }

  const pending = inflight.get(locale);

  if (pending) {
    return pending;
  }

  const responses = resolver(files, locale);

  if (Object.values(files).every((value) => typeof value === 'object' && value !== null)) {
    store(locale, responses);

    return;
  }

  const loading = Promise.all(responses)
    .then((loaded) => store(locale, loaded))
    .finally(() => inflight.delete(locale));

  inflight.set(locale, loading);

  return loading;
}

function reportLoadError(error: unknown): void {
  console.error('[laravel-react-i18n] Could not load translations.', error);
}

/**
 * Called by the provider while rendering, so it never notifies: subscribers are not mounted yet.
 * Lazy files keep `loading` true until they arrive, then notify.
 */
export function configure(options: OptionsInterface): void {
  const defaults = initialState();

  files = options.files;
  locales = recognizer(files);

  const locale = options.locale || defaults.locale;
  const fallbackLocale = options.fallbackLocale || defaults.fallbackLocale;
  const pending = [load(locale), load(fallbackLocale)].filter(Boolean);

  requested = locale;
  state = { locale, fallbackLocale, loading: pending.length > 0 };

  if (pending.length > 0) {
    void Promise.all(pending)
      .catch(reportLoadError)
      .finally(() => update({ loading: false }));
  }
}

/**
 * Switches once the locale's files are loaded; until then the current locale stays visible.
 * When called again before that, the last call wins.
 */
export async function setLocale(locale: string): Promise<void> {
  requested = locale;

  const pending = load(locale);

  if (pending) {
    update({ loading: true });

    try {
      await pending;
    } catch (error) {
      reportLoadError(error);

      if (requested === locale) {
        update({ loading: false });
      }

      return;
    }
  }

  if (requested !== locale) {
    return;
  }

  if (typeof document !== 'undefined') {
    // When setting the HTML lang attribute, hyphen must be use instead of underscore.
    document.documentElement.setAttribute('lang', locale.replace('_', '-'));
  }

  update({ locale, loading: false });
}

export function activeLocale(current: I18nState): string {
  return current.locale;
}

/** Locale first, then the fallback locale, then the key itself. */
export function translate(current: I18nState, key: string, replacements: ReplacementsInterface = {}): string {
  const lookup = (locale: string) => translations.get(locale)?.[key];
  const message = (locales.isLocale(current.locale) && lookup(current.locale)) || lookup(current.fallbackLocale) || key;

  return replacer(message, replacements);
}

export function translateChoice(
  current: I18nState,
  key: string,
  number: number,
  replacements: ReplacementsInterface = {}
): string {
  const message = translate(current, key, replacements);
  const locale = locales.isLocale(current.locale) ? current.locale : current.fallbackLocale;

  return replacer(pluralization(message, number, locale), {
    ...replacements,
    count: number.toString()
  });
}

/**
 * Get the translation for the given key.
 */
export function trans(key: string, replacements?: ReplacementsInterface): string {
  return translate(state, key, replacements);
}

/**
 * Translates the given message based on a count.
 */
export function transChoice(key: string, number: number, replacements?: ReplacementsInterface): string {
  return translateChoice(state, key, number, replacements);
}

/**
 * The locale currently in use.
 */
export function getActiveLanguage(): string {
  return activeLocale(state);
}

export function isLocale(locale: string): boolean {
  return locales.isLocale(locale);
}

export function getLocales(): string[] {
  return locales.getLocales();
}
