import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type ReplacementsInterface from '../src/interfaces/replacements.js';

type I18n = typeof import('../src/index.js');

const eagerFiles = import.meta.glob('./__mocks__/lang/*.json', { eager: true });
const lazyFiles = import.meta.glob('./__mocks__/lang/*.json');

const tHookCases: [string, undefined | ReplacementsInterface, string | []][] = [
  ['130 Days', undefined, '130 Days'],
  [':amount Total', { amount: 'ten' }, 'Ten Total'],
  [':amount Total', { amount: 12 }, '12 Total'],
  ['Accept Invitation', undefined, 'Accept Invitation'],

  ['validation.accepted', { attribute: 'your' }, 'The your field must be accepted.'],
  ['validation.accepted', undefined, 'The :attribute field must be accepted.'],
  [
    'validation.between.array',
    { attribute: '"my custom"', min: 1, max: 10 },
    'The "my custom" field must have between 1 and 10 items.'
  ],
  ['validation.between.array', undefined, 'The :attribute field must have between :min and :max items.'],
  ['validation.custom.attribute-name.rule-name', undefined, 'custom-message'],
  ['validation.attributes', undefined, []],

  ['custom.Welcome', undefined, 'Welcome'],
  ['custom.sub_level1.text', undefined, "I'm sub level 1"],
  ['custom.sub_level1.sub_level2.text', undefined, "I'm sub level 2"],
  ['custom.sub_level1.sub_level2.sub_level3.text', undefined, "I'm sub level 3"],
  ['custom.sub_level1.sub_level2.sub_level3.sub_level4.text', undefined, "I'm sub level 4"]
];

const tChoiceHookCases: [string, number, undefined | ReplacementsInterface, string][] = [
  ['custom.apple_count', 1, undefined, '1 apple'],
  ['custom.apple_count', 10, undefined, '10 apples'],
  ['custom.min_ago', 1, undefined, '1 minute ago'],
  ['custom.min_ago', 4, undefined, '4 minutes ago'],
  ['custom.min_left_for_reason', 1, undefined, '1 minute left for :reason'],
  ['custom.min_left_for_reason', 1, { reason: 'auto logout' }, '1 minute left for auto logout'],
  ['custom.min_left_for_reason', 15, { reason: 'auto logout' }, '15 minutes left for auto logout']
];

// The store is module-level: every test gets a fresh copy so earlier loads cannot leak in.
let i18n: I18n;

beforeEach(async () => {
  vi.resetModules();
  i18n = await import('../src/index.js');
  document.documentElement.lang = '';
});

function provider(props: { locale?: string; fallbackLocale?: string; files: Record<string, unknown> }) {
  return ({ children }: { children: ReactNode }) => (
    <i18n.LaravelReactI18nProvider {...props}>{children}</i18n.LaravelReactI18nProvider>
  );
}

function renderI18n(props: Parameters<typeof provider>[0]) {
  return renderHook(() => i18n.useLaravelReactI18n(), { wrapper: provider(props) }).result;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const english = { default: { Hello: 'Hello', Bye: 'Bye' } };

describe('provider', () => {
  it.each(tHookCases)('t(%s) with eager files', (key, replacements, expected) => {
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files: eagerFiles });

    expect(result.current.t(key, replacements)).toEqual(expected);
  });

  it.each(tChoiceHookCases)('tChoice(%s, %d)', (key, number, replacements, expected) => {
    const result = renderI18n({ locale: 'en', files: eagerFiles });

    expect(result.current.tChoice(key, number, replacements)).toBe(expected);
  });

  it('renders eager translations on the very first render', () => {
    const result = renderI18n({ locale: 'de', fallbackLocale: 'en', files: eagerFiles });

    expect(result.current.loading).toBe(false);
    expect(result.current.t('30 Days')).toBe('30 Tage');
  });

  it('shows lazy translations as soon as they arrive, without another interaction', async () => {
    const result = renderI18n({ locale: 'uk', fallbackLocale: 'en', files: lazyFiles });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.t('30 Days')).toBe('30 днів'));
    expect(result.current.loading).toBe(false);
  });

  it('switches the locale and keeps translating outside components', async () => {
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files: eagerFiles });

    await act(() => i18n.setLocale('de'));

    expect(result.current.t('30 Days')).toBe('30 Tage');
    expect(result.current.currentLocale()).toBe('de');
    expect(i18n.getActiveLanguage()).toBe('de');
    expect(i18n.trans('30 Days')).toBe('30 Tage');
    expect(document.documentElement.lang).toBe('de');
  });

  it('falls back for unknown locales and keys', () => {
    const result = renderI18n({ locale: 'xx', fallbackLocale: 'de', files: eagerFiles });

    expect(result.current.t('Accept Invitation')).toBe('Accept Invitation');
    expect(result.current.t('30 Days')).toBe('30 Tage');
  });

  it('falls back to the fallback locale, not the previously shown one', async () => {
    const files = {
      '/lang/en.json': { Only: 'English' },
      '/lang/de.json': { Only: 'Deutsch' },
      '/lang/fr.json': {}
    };
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files });

    await act(() => i18n.setLocale('de'));
    await act(() => i18n.setLocale('fr'));

    expect(result.current.t('Only')).toBe('English');
  });

  it('applies the last requested locale when loads finish out of order', async () => {
    const german = deferred<unknown>();
    const files = {
      '/lang/en.json': () => Promise.resolve(english),
      '/lang/de.json': () => german.promise,
      '/lang/fr.json': () => Promise.resolve({ default: { Hello: 'Bonjour' } })
    };
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const toGerman = i18n.setLocale('de');
    await act(() => i18n.setLocale('fr'));

    expect(result.current.currentLocale()).toBe('fr');

    german.resolve({ default: { Hello: 'Hallo' } });
    await act(() => toGerman);

    expect(result.current.currentLocale()).toBe('fr');
    expect(result.current.t('Hello')).toBe('Bonjour');
    expect(result.current.loading).toBe(false);
  });

  it('loads a locale once when it is requested twice at the same time', async () => {
    const loadGerman = vi.fn(() => Promise.resolve({ default: { Hello: 'Hallo' } }));
    const files = { '/lang/en.json': () => Promise.resolve(english), '/lang/de.json': loadGerman };
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files });

    await act(() => Promise.all([i18n.setLocale('de'), i18n.setLocale('de')]));

    expect(loadGerman).toHaveBeenCalledOnce();
    expect(result.current.t('Hello')).toBe('Hallo');
  });

  it('keeps the current locale and stops loading when a locale fails to load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const files = {
      '/lang/en.json': () => Promise.resolve(english),
      '/lang/de.json': () => Promise.reject(new Error('chunk 404'))
    };
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => i18n.setLocale('de'));

    expect(result.current.currentLocale()).toBe('en');
    expect(result.current.loading).toBe(false);
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });

  it('follows a changed locale prop', async () => {
    function Locale() {
      return <p data-testid="locale">{i18n.useLaravelReactI18n().currentLocale()}</p>;
    }

    const app = (locale: string) => (
      <i18n.LaravelReactI18nProvider locale={locale} fallbackLocale="en" files={eagerFiles}>
        <Locale />
      </i18n.LaravelReactI18nProvider>
    );
    const view = render(app('en'));

    view.rerender(app('de'));

    await waitFor(() => expect(view.getByTestId('locale').textContent).toBe('de'));
  });

  it('uses the fallback plural rules for an unknown locale', () => {
    const result = renderI18n({ locale: 'xx', fallbackLocale: 'en', files: eagerFiles });

    expect(result.current.tChoice('custom.apple_count', 1)).toBe('1 apple');
  });

  it('exposes the standalone helpers', async () => {
    renderI18n({ locale: 'en', fallbackLocale: 'en', files: eagerFiles });

    expect(i18n.transChoice('custom.apple_count', 3)).toBe('3 apples');
    expect(i18n.isLocale('fr')).toBe(true);
    expect(i18n.getLocales()).toEqual(['de', 'en', 'fr', 'it', 'nl', 'uk']);
  });

  it('loads lazy locales that only have a JSON or only a PHP file', async () => {
    const files = {
      '/lang/en.json': () => Promise.resolve({ default: { Hello: 'Hello' } }),
      '/lang/php_fr.json': () => Promise.resolve({ default: { 'auth.failed': 'Échec' } })
    };
    const result = renderI18n({ locale: 'fr', fallbackLocale: 'en', files });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.t('auth.failed')).toBe('Échec');
    expect(result.current.t('Hello')).toBe('Hello');
  });

  it('takes the locale from <html lang> when none is passed', () => {
    document.documentElement.lang = 'de';

    const result = renderI18n({ fallbackLocale: 'en', files: eagerFiles });

    expect(result.current.currentLocale()).toBe('de');
    expect(result.current.t('30 Days')).toBe('30 Tage');
  });

  it('ignores a failed load that a newer setLocale call already replaced', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const german = deferred<unknown>();
    const files = {
      '/lang/en.json': () => Promise.resolve(english),
      '/lang/de.json': () => german.promise,
      '/lang/fr.json': () => Promise.resolve({ default: { Hello: 'Bonjour' } })
    };
    const result = renderI18n({ locale: 'en', fallbackLocale: 'en', files });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const toGerman = i18n.setLocale('de');
    await act(() => i18n.setLocale('fr'));

    german.reject(new Error('chunk 404'));
    await act(() => toGerman);

    expect(result.current.currentLocale()).toBe('fr');
    expect(result.current.loading).toBe(false);

    error.mockRestore();
  });

  it('hydrates server markup rendered with eager files without a mismatch', async () => {
    function Greeting() {
      return <p>{i18n.useLaravelReactI18n().t(':amount Total', { amount: 3 })}</p>;
    }

    const app = (
      <i18n.LaravelReactI18nProvider locale="de" fallbackLocale="en" files={eagerFiles}>
        <Greeting />
      </i18n.LaravelReactI18nProvider>
    );
    const container = document.createElement('div');
    const onRecoverableError = vi.fn();

    container.innerHTML = renderToString(app);
    expect(container.textContent).toBe('3 Gesamt');

    await act(async () => {
      hydrateRoot(container, app, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('3 Gesamt');
  });
});
