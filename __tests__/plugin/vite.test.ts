import fs from 'fs';
import os from 'os';
import path from 'path';
import type { HmrContext } from 'vite';

import i18n from '../../src/vite.js';

const logger = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));

vi.mock('vite', () => ({ createLogger: () => logger }));

let root: string;
let lang: string;

// A throwaway copy of the fixture lang folder: the plugin writes php_*.json and type files next to it.
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'laravel-react-i18n-'));
  lang = path.join(root, 'lang');
  fs.cpSync(path.resolve('__tests__/__mocks__/lang'), lang, {
    recursive: true,
    filter: (source) => !path.basename(source).startsWith('php_')
  });
  logger.error.mockClear();
  logger.info.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

function plugin(config: Parameters<typeof i18n>[0] = {}) {
  const instance = i18n({ langDirname: lang, ...config });

  return {
    config: () => (instance.config as () => void)(),
    hotUpdate: (file: string) => (instance.handleHotUpdate as (ctx: HmrContext) => void)({ file } as HmrContext)
  };
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(lang, file), 'utf8'));
}

describe('vite plugin', () => {
  it('flattens every PHP locale into php_{locale}.json', () => {
    plugin().config();

    expect(fs.readdirSync(lang).filter((file) => file.startsWith('php_'))).toEqual([
      'php_en.json',
      'php_fr.json',
      'php_it.json'
    ]);
    expect(readJson('php_en.json')['custom.sub_level1.text']).toBe("I'm sub level 1");
  });

  it('reports a missing lang folder', () => {
    plugin({ langDirname: path.join(root, 'missing') }).config();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('lang:publish'), { timestamp: true });
  });

  it('only notes it when there are no PHP translations', () => {
    const jsonOnly = path.join(root, 'json-only');

    fs.mkdirSync(jsonOnly);
    fs.writeFileSync(path.join(jsonOnly, 'de.json'), '{"Hello":"Hallo"}');

    plugin({ langDirname: jsonOnly }).config();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('php translations'), { timestamp: true });
    expect(fs.readdirSync(jsonOnly)).toEqual(['de.json']);
  });

  it('writes the key type for the configured locale and fallback', () => {
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_LOCALE', 'en');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE', 'fr');

    plugin({ typeTranslationKeys: true, typeDestinationPath: root }).config();

    const types = fs.readFileSync(path.join(root, 'LaravelReactI18n.types.ts'), 'utf8');

    expect(types).toMatch(/^export type I18nKeyType = /);
    expect(types).toContain("'auth.failed'");
    expect(types).toContain("'custom.sub\\_level1.text'");
  });

  it('types the JSON keys when a project has no PHP translations', () => {
    const jsonOnly = path.join(root, 'lang-json');

    fs.mkdirSync(jsonOnly);
    fs.writeFileSync(path.join(jsonOnly, 'de.json'), '{"Hello":"Hallo"}');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_LOCALE', 'de');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE', 'de');

    plugin({ langDirname: jsonOnly, typeTranslationKeys: true, typeDestinationPath: `${root}/` }).config();

    expect(fs.readFileSync(path.join(root, 'LaravelReactI18n.types.ts'), 'utf8')).toBe(
      "export type I18nKeyType = 'Hello';"
    );
  });

  it('regenerates the JSON when a PHP lang file changes, and only then', () => {
    const i18nPlugin = plugin();

    i18nPlugin.config();
    fs.writeFileSync(path.join(lang, 'en', 'custom.php'), "<?php return ['Welcome' => 'Hi'];");

    i18nPlugin.hotUpdate(path.join(lang, 'de.json'));
    expect(readJson('php_en.json')['custom.Welcome']).toBe('Welcome');

    i18nPlugin.hotUpdate(path.join(lang, 'en', 'custom.php'));
    expect(readJson('php_en.json')['custom.Welcome']).toBe('Hi');
  });

  it('refreshes the key type on hot updates', () => {
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_LOCALE', 'en');

    const i18nPlugin = plugin({ typeTranslationKeys: true, typeDestinationPath: root });

    i18nPlugin.config();
    fs.writeFileSync(path.join(lang, 'en', 'custom.php'), "<?php return ['Fresh' => 'Key'];");
    i18nPlugin.hotUpdate(path.join(lang, 'en', 'custom.php'));

    expect(fs.readFileSync(path.join(root, 'LaravelReactI18n.types.ts'), 'utf8')).toContain("'custom.Fresh'");
  });
});

describe('vite plugin edge cases', () => {
  it('reads ./lang by default', () => {
    (i18n().config as () => void)();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('lang:publish'), { timestamp: true });
  });

  it('skips type generation for locales that do not exist', () => {
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_LOCALE', 'xx');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE', 'yy');

    plugin({ typeTranslationKeys: true, typeDestinationPath: root }).config();

    expect(fs.readFileSync(path.join(root, 'LaravelReactI18n.types.ts'), 'utf8')).toBe('export type I18nKeyType = ;');
  });

  it('types JSON-only locale and fallback, also on hot updates', () => {
    const jsonOnly = path.join(root, 'lang-json');

    fs.mkdirSync(jsonOnly);
    fs.writeFileSync(path.join(jsonOnly, 'de.json'), '{"Hallo":"Hallo"}');
    fs.writeFileSync(path.join(jsonOnly, 'en.json'), '{"Hello":"Hello"}');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_LOCALE', 'de');
    vi.stubEnv('VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE', 'en');

    const i18nPlugin = plugin({ langDirname: jsonOnly, typeTranslationKeys: true, typeDestinationPath: root });

    i18nPlugin.config();
    fs.writeFileSync(path.join(jsonOnly, 'en.json'), '{"Hello":"Hello","Bye":"Bye"}');
    i18nPlugin.hotUpdate(path.join(jsonOnly, 'en.json'));

    expect(fs.readFileSync(path.join(root, 'LaravelReactI18n.types.ts'), 'utf8')).toBe(
      "export type I18nKeyType = 'Hallo'|'Hello'|'Bye';"
    );
  });

  it('flattens nested PHP folders into dotted keys', () => {
    fs.mkdirSync(path.join(lang, 'en', 'admin'));
    fs.writeFileSync(path.join(lang, 'en', 'admin', 'users.php'), "<?php return ['title' => 'Users'];");

    plugin().config();

    expect(readJson('php_en.json')['admin.users.title']).toBe('Users');
  });
});
