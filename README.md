<h1 align="center" style="border:none !important">
    Laravel React i18n
</h1>

<p align="center">
    <b>@innoge/laravel-react-i18n</b> is a <b>React</b> plugin that allows to connect your <b>Laravel</b> Framework translation
    files with <b>React</b>. It uses the same logic used on <a href="https://laravel.com/docs/localization">Laravel Localization</a>.
</p>

> Maintained fork of [EugeneMeles/laravel-react-i18n](https://github.com/EugeneMeles/laravel-react-i18n) by InnoGE.
> The provider and hook keep the `laravel-react-i18n` 2.x API. What changed in 3.0:
>
> - `react` is a peer dependency (React 18 and 19), so the package never brings its own React copy (fixes "Invalid hook call" / `dispatcher is null` crashes).
> - Translations live in one shared store read through `useSyncExternalStore`: lazily loaded locales show up as soon as they arrive, eager ones on the first render.
> - `trans()`, `transChoice()`, `getActiveLanguage()`, `setLocale()`, `isLocale()` and `getLocales()` work outside components.
> - Typed `@innoge/laravel-react-i18n/vite` plugin for Vite 6–8.
>
> **Breaking changes when migrating from `laravel-react-i18n`** (replace the package name in your imports, then check these):
>
> - ESM only: the CommonJS build (`main`, `dist/cjs`, the `vite.js` shim) is gone, so `require()` and CommonJS Jest setups need ESM support.
> - Only `@innoge/laravel-react-i18n` and `@innoge/laravel-react-i18n/vite` can be imported; deep imports such as `.../dist/...` or the `ContextInterface` type are blocked by the `exports` map.
> - All providers share one store. Nested or side-by-side providers (Storybook decorators, a second React root) no longer get their own locale.
> - `setLocale()` returns a promise and switches once the locale's files are loaded; until then `currentLocale()` stays on the old locale. When it is called again before that, the last call wins.
> - Keys missing in the current locale fall back to `fallbackLocale`, no longer to the previously shown locale.
> - Changing the provider's `locale` prop after mount switches the locale (2.x ignored it).
> - `loading` is false once eager files are in (2.x kept it true forever on the client).
> - The `ssr` provider prop is no longer needed and is ignored.
> - The Vite plugin no longer deletes the generated `php_*.json` files when the dev server stops; gitignore them.

## Requirements
- Laravel >= 10
- Node.js >= 22.12
- React 18 or 19
- Vite 6, 7 or 8

## Installation

```sh
npm i @innoge/laravel-react-i18n
```

## Setup


#### CSR (Client Side Rendering)

`app.tsx:`

```tsx
import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { LaravelReactI18nProvider } from '@innoge/laravel-react-i18n';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
  setup({ el, App, props }) {
    const root = createRoot(el);

    root.render(
      <LaravelReactI18nProvider
        locale={'uk'}
        fallbackLocale={'en'}
        files={import.meta.glob('/lang/*.json')}
      >
        <App {...props} />
      </LaravelReactI18nProvider>
    );
  },
  progress: {
    color: '#4B5563',
  },
});

```

#### SSR (Server Side Rendering)

Load the files eagerly (`{ eager: true }`) on the client too, at least for every locale the server renders. Otherwise the first client render shows the raw keys while the lazy files load, and React reports a hydration mismatch.

The store is shared by the whole server process. That is safe with the synchronous `renderToString` Inertia uses, but not with streaming renderers that interleave requests in different locales, and `trans()` must not run at module scope on the server (it would capture whichever locale rendered first).

`ssr.tsx:`

```tsx
import ReactDOMServer from 'react-dom/server';
import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import route from '../../vendor/tightenco/ziggy/dist/index.m';
import { LaravelReactI18nProvider } from '@innoge/laravel-react-i18n';

const appName = 'Laravel';

createServer((page) =>
  createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup: ({ App, props }) => {
      global.route = (name, params, absolute) =>
        route(name, params, absolute, {
          // @ts-expect-error
          ...page.props.ziggy,
          // @ts-expect-error
          location: new URL(page.props.ziggy.location),
        });

      return (
        <LaravelReactI18nProvider
          locale={'uk'}
          fallbackLocale={'en'}
          files={import.meta.glob('/lang/*.json', { eager: true })}
        >
          <App {...props} />
        </LaravelReactI18nProvider>
      );
    },
  })
);

```

#### PHP Translations Available on React

In order to load `php` translations, you can use this `Vite` plugin.

`vite.config.js:`

```js
import i18n from '@innoge/laravel-react-i18n/vite'; // <-- add this

export default defineConfig({
    plugins: [
        laravel([
            'resources/css/app.css',
            'resources/js/app.js'
        ]),
        react(),
        i18n(), // <-- add this
    ],
});
```

> The plugin generates a `php_{lang}.json` file per locale in your lang folder whenever Vite starts or a PHP lang file changes.
> Keep them out of git:

```
lang/php_*.json
```

## Usage


### Provider Options

- `locale` *(optional)*: If not provided it will try to find from the `<html lang="">` tag or set `en`.
- `fallbackLocale` *(optional)*: If the `locale` was not provided or is invalid, it will try reach for this `fallbackLocale` instead, default it will try to find from the `<html lang="">` tag or set `en`.
- `files` *(required)*: The way to reach your language files.

```js
<LaravelReactI18nProvider
  locale={'ro'}
  files={import.meta.glob('/lang/*.json')}
>
...
``` 

### Hook Response:
```tsx
...
import { useLaravelReactI18n } from '@innoge/laravel-react-i18n';

export default function Component() {
    const { t, tChoice, currentLocale, setLocale, getLocales, isLocale, loading } = useLaravelReactI18n();
    ...
}

```

### `t(key: string, replacements?: {[key: string]: string | number})`

The `t()` method can translate a given message.

`lang/pt.json:`
```json
{
    "Welcome!": "Bem-vindo!",
    "Welcome, :name!": "Bem-vindo, :name!"
}
```

`welcome.tsx:`
```tsx
...
const { t } = useLaravelReactI18n();

t('Welcome!'); // Bem-vindo!
t('Welcome, :name!', { name: 'Francisco' }); // Bem-vindo Francisco!
t('Welcome, :NAME!', { name: 'Francisco' }); // Bem-vindo FRANCISCO!
t('Some untranslated'); // Some untranslated
...
```

### `tChoice(key: string, count: number, replacements?: {[key: string]: string | number})`

The `tChoice()` method can translate a given message based on a count,
there is also available an `trans_choice` alias, and a mixin called `$tChoice()`.

`lang/pt.json:`
```json
{
  "There is one apple|There are many apples": "Existe uma maça|Existe muitas maças",
  "{0} There are none|[1,19] There are some|[20,*] There are many": "Não tem|Tem algumas|Tem muitas",
  "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos",
}
```

`choice.tsx:`
```tsx
...
const { tChoice } = useLaravelReactI18n()

tChoice('There is one apple|There are many apples', 1); // Existe uma maça
tChoice('{0} There are none|[1,19] There are some|[20,*] There are many', 19); // Tem algumas
tChoice('{1} :count minute ago|[2,*] :count minutes ago', 10); // Há 10 minutos.
...
```

### `currentLocale()`

The `currentLocale()` returns the locale that is currently being used.

```tsx
const { currentLocale } = useLaravelReactI18n()

currentLocale(); // en
```

### `setLocale(locale: string)`

The `setLocale()` can be used to change the locale during the runtime.

```tsx
const { currentLocale, setLocale } = useLaravelReactI18n();

function handler() {
    setLocale('it')
}

return (
    <div>
        <h1>Current locale: `{currentLocale()}`</h1>
        <button onClick={handler}>Change locale to `it`</button>
    </div>
)
```

### `getLocales()`

The `getLocales()` return string array with all locales available in folder `/lang/*`.

```text
/lang/..
  de.json
  en.json
  nl.json
  uk.json
```

`myLocales.tsx:`
```tsx
const { getLocales } = useLaravelReactI18n();

getLocales(); // ['de', 'en', 'nl', 'uk']
```

### `isLocale(locale: string)`

The `isLocale()` method checks the locale is available in folder `/lang/*`.

```tsx
const { isLocale } = useLaravelReactI18n();

isLocale('uk'); // true
isLocale('fr'); // false
```

### Outside components

Helpers, formatters and toasts can translate without the hook. They read the same store, so call them after the provider has rendered:

```ts
import { getActiveLanguage, trans, transChoice } from '@innoge/laravel-react-i18n';

toast.error(trans('validation.failed'));
new Intl.NumberFormat(getActiveLanguage()).format(1234.5);
```

Components should keep using the hook: it re-renders them when the locale changes.

### `loading`

`loading` is true while a lazily loaded locale is being fetched. With eager files (`{ eager: true }`, required for SSR) it is never true.

```tsx
const { loading, currentLocale, setLocale } = useLaravelReactI18n();

function handler() {
    setLocale('it')
}

if (loading) return <p>Loading...</p>;

return (
    <div>
        <h1>Current locale: `{currentLocale()}`</h1>
        <button onClick={handler}>Change locale to `it`</button>
    </div>
)
```
