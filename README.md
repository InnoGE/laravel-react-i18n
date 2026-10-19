# @innoge/laravel-react-i18n

[![npm](https://img.shields.io/npm/v/@innoge/laravel-react-i18n.svg)](https://www.npmjs.com/package/@innoge/laravel-react-i18n)
[![Testing](https://github.com/InnoGE/laravel-react-i18n/actions/workflows/test.yml/badge.svg)](https://github.com/InnoGE/laravel-react-i18n/actions/workflows/test.yml)
[![License](https://img.shields.io/npm/l/@innoge/laravel-react-i18n.svg)](LICENSE.md)

Use your Laravel translations (`lang/*.json` and `lang/{locale}/*.php`) in React, with the same keys, placeholders and pluralization rules as [Laravel's localization](https://laravel.com/docs/localization).

- `t()` and `tChoice()` through a hook, `trans()` and `transChoice()` anywhere else
- PHP lang files turned into JSON by a Vite plugin, with optional key types
- Works with Inertia SSR, React 18 and 19

## Requirements

- Laravel 10+, with published lang files (`php artisan lang:publish`)
- Node.js 22.12+
- React 18 or 19
- Vite 6, 7 or 8

## Quick start (Inertia + React)

```sh
npm i @innoge/laravel-react-i18n
```

**1. Vite plugin**: turns `lang/{locale}/*.php` into `lang/php_{locale}.json`.

```ts
// vite.config.ts
import i18n from '@innoge/laravel-react-i18n/vite';

export default defineConfig({
    plugins: [laravel({ /* … */ }), react(), tailwindcss(), i18n()],
});
```

Keep the generated files out of git:

```
# .gitignore
lang/php_*.json
```

**2. Provider**: wrap the app once.

```tsx
// resources/js/app.tsx
import { createInertiaApp } from '@inertiajs/react';
import { LaravelReactI18nProvider } from '@innoge/laravel-react-i18n';

createInertiaApp({
    // …
    withApp(app) {
        return (
            <LaravelReactI18nProvider
                locale={document.documentElement.lang}
                fallbackLocale="en"
                files={import.meta.glob('/lang/*.json', { eager: true })}
            >
                {app}
            </LaravelReactI18nProvider>
        );
    },
});
```

**3. Translate.**

```tsx
import { useLaravelReactI18n } from '@innoge/laravel-react-i18n';

export default function Welcome({ user }: { user: { name: string } }) {
    const { t, tChoice } = useLaravelReactI18n();

    return (
        <>
            <h1>{t('Welcome, :name!', { name: user.name })}</h1>
            <p>{tChoice('messages.unread', 3)}</p>
        </>
    );
}
```

### SSR

The server renders with eager files, so the client must use eager files too, at least for the locales the server renders. With lazy files the first client render shows raw keys and React reports a hydration mismatch.

Share the locale with the page (`'locale' => app()->getLocale()` in `HandleInertiaRequests::share()`), then:

```tsx
// resources/js/ssr.tsx
createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        // …
        setup: ({ App, props }) => (
            <LaravelReactI18nProvider
                locale={props.initialPage.props.locale as string}
                fallbackLocale="en"
                files={import.meta.glob('/lang/*.json', { eager: true })}
            >
                <App {...props} />
            </LaravelReactI18nProvider>
        ),
    }),
);
```

The translation store is shared by the whole server process. That is safe with `renderToString`, which renders one request at a time. Do not use streaming renderers with several locales, and do not call `trans()` at module scope on the server: it would capture whichever locale rendered first.

## Usage

### Translations

Keys work like Laravel's `__()`: JSON keys (`lang/de.json`) and dotted PHP keys (`lang/de/auth.php` → `auth.failed`, nested folders included). Missing keys fall back to `fallbackLocale`, then to the key itself.

```tsx
const { t } = useLaravelReactI18n();

t('Welcome!'); // Willkommen!
t('Welcome, :name!', { name: 'Ida' }); // Willkommen, Ida!
t('Welcome, :NAME!', { name: 'Ida' }); // Willkommen, IDA!
t('auth.failed'); // from lang/de/auth.php
t('Some untranslated text'); // Some untranslated text
```

### Pluralization

`tChoice()` picks the form for a count with Laravel's rules, including inline ranges. `:count` is filled in automatically.

```json
{
    "messages.unread": "{0} No new messages|{1} :count new message|[2,*] :count new messages"
}
```

```tsx
tChoice('messages.unread', 0); // No new messages
tChoice('messages.unread', 5); // 5 new messages
```

### Switching the locale

```tsx
const { currentLocale, setLocale, loading } = useLaravelReactI18n();

<button onClick={() => setLocale('en')}>English</button>;
```

`setLocale()` returns a promise. The new locale is applied once its files are loaded; until then the current one stays visible and `loading` is `true` (only with lazy files). If it is called again before that, the last call wins. It also updates `<html lang>`.

Changing the provider's `locale` prop switches the locale as well.

### Outside components

Helpers, formatters and toast messages can use the same store without the hook:

```ts
import { getActiveLanguage, trans, transChoice } from '@innoge/laravel-react-i18n';

toast.error(trans('validation.failed'));
new Intl.NumberFormat(getActiveLanguage()).format(1234.5);
```

These read the current state but do not re-render anything; components should use the hook.

## API reference

### `<LaravelReactI18nProvider>`

| Prop             | Type                                         | Default                  |
| ---------------- | -------------------------------------------- | ------------------------ |
| `files`          | `import.meta.glob('/lang/*.json', …)` result | required                 |
| `locale`         | `string`                                     | `<html lang>`, then `en` |
| `fallbackLocale` | `string`                                     | `<html lang>`, then `en` |

Pass `{ eager: true }` to load every locale up front (needed for SSR); without it each locale is fetched when first used.

### `useLaravelReactI18n()`

| Returns                              | Description                                    |
| ------------------------------------ | ---------------------------------------------- |
| `t(key, replacements?)`              | Translation with `:placeholder` replacements   |
| `tChoice(key, count, replacements?)` | Pluralized translation                         |
| `currentLocale()`                    | The active locale                              |
| `setLocale(locale)`                  | Switch locale; resolves once loaded            |
| `loading`                            | `true` while a lazily loaded locale is fetched |
| `getLocales()`                       | Locales found in `lang/`                       |
| `isLocale(locale)`                   | Whether `lang/` has that locale                |

For typed keys, pass the generated type: `useLaravelReactI18n<I18nKeyType>()`.

### Standalone functions

`trans()`, `transChoice()`, `getActiveLanguage()`, `setLocale()`, `getLocales()` and `isLocale()`, with the same signatures as above.

### Vite plugin

```ts
i18n({
    langDirname: 'lang', // where Laravel's lang files live
    typeTranslationKeys: false, // write a union type of all keys
    typeDestinationPath: 'resources/js', // folder for LaravelReactI18n.types.ts
});
```

With `typeTranslationKeys`, set `VITE_LARAVEL_REACT_I18N_LOCALE` (and optionally `VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE`) in `.env`; the keys of those locales become `I18nKeyType`. The plugin regenerates the JSON and the type when a PHP lang file changes during `npm run dev`.

## Migrating from `laravel-react-i18n` 2.x

Replace the package name in your imports and `vite.config`, then check these changes:

- **ESM only.** The CommonJS build is gone, so `require()` and CommonJS Jest setups need ESM support. Deep imports (`…/dist/…`, `ContextInterface`) are blocked by the `exports` map.
- **One shared store.** All providers share it; nested or side-by-side providers no longer get their own locale.
- **`setLocale()`** returns a promise and switches once the files are loaded; with overlapping calls the last one wins.
- **Fallback.** Keys missing in the current locale fall back to `fallbackLocale`, not to the previously shown locale.
- **`locale` prop changes** after mount now switch the locale (2.x ignored them).
- **`loading`** is `false` once eager files are in (2.x kept it `true` on the client).
- **`ssr` prop** is no longer needed and is ignored.
- **Generated files stay.** The Vite plugin no longer deletes `php_*.json` when the dev server stops; gitignore them.

Fixed along the way: React 19 and SSR crashes (`react` is now a peer dependency), translations that only appeared after the next interaction, and missing types for the Vite plugin.

## Contributing

```sh
npm ci
npm test              # Vitest
npm run test:coverage # must stay at 100%
npm run types:check
npm run format:check
```

Changes go through pull requests against `main`. Releases are published from `v*` tags by GitHub Actions with npm provenance. Report security issues privately, see [SECURITY.md](SECURITY.md).

## Credits

Forked from [EugeneMeles/laravel-react-i18n](https://github.com/EugeneMeles/laravel-react-i18n) by Eugene Meles. Maintained by [InnoGE](https://innoge.de). MIT licensed, see [LICENSE.md](LICENSE.md).
