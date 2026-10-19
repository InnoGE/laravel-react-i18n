import fs from 'fs';

import { createLogger, type HmrContext, type Plugin } from 'vite';

import { convertToKeyType, saveKeyTypeToFile } from './plugin/key-type.js';
import parser from './plugin/parser.js';
import locale from './plugin/locale.js';

export interface ConfigInterface {
  langDirname?: string;
  typeDestinationPath?: string;
  typeTranslationKeys?: boolean;
}

/**
 *
 */
export default function i18n(config?: ConfigInterface): Plugin {
  const langDirname = config?.langDirname ? config.langDirname : 'lang';

  const logger = createLogger('info', { prefix: '[laravel-react-i18n]' });

  let isPhpLocale = false;
  let jsonLocales: string[] = [];
  let phpLocales: string[] = [];

  function pushKeys(keys: string[], locales: string[]) {
    if (
      typeof process.env.VITE_LARAVEL_REACT_I18N_LOCALE !== 'undefined' &&
      locales.includes(process.env.VITE_LARAVEL_REACT_I18N_LOCALE)
    ) {
      const fileName = isPhpLocale
        ? `php_${process.env.VITE_LARAVEL_REACT_I18N_LOCALE}`
        : process.env.VITE_LARAVEL_REACT_I18N_LOCALE;
      keys.push(convertToKeyType(langDirname, fileName));
    }

    if (
      typeof process.env.VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE !== 'undefined' &&
      locales.includes(process.env.VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE) &&
      process.env.VITE_LARAVEL_REACT_I18N_LOCALE !== process.env.VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE
    ) {
      const fileName = isPhpLocale
        ? `php_${process.env.VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE}`
        : process.env.VITE_LARAVEL_REACT_I18N_FALLBACK_LOCALE;
      keys.push(convertToKeyType(langDirname, fileName));
    }
  }

  return {
    name: 'i18n',
    enforce: 'post',
    config() {
      const keys: string[] = [];

      // Check language directory is exists.
      if (!fs.existsSync(langDirname)) {
        const msg = [
          'Language directory is not exist, maybe you did not publish the language files with `php artisan lang:publish`.',
          'For more information please visit: https://laravel.com/docs/localization#publishing-the-language-files'
        ];

        msg.map((str) => logger.error(str, { timestamp: true }));
        return;
      }

      // JSON-file locales.
      jsonLocales = locale.getJsonLocale(langDirname);

      if (config?.typeTranslationKeys) {
        pushKeys(keys, jsonLocales);
      }

      // PHP-file locales.
      phpLocales = locale.getPhpLocale(langDirname);

      if (phpLocales.length > 0) {
        // The generated php_*.json files stay (gitignore them): deleting them on exit broke every other dev server and build sharing the lang directory.
        parser(langDirname);
        isPhpLocale = true;

        if (config?.typeTranslationKeys) {
          pushKeys(keys, phpLocales);
        }
      } else {
        const msg = [
          'Language directory not contain php translations files.',
          'For more information please visit: https://laravel.com/docs/localization#introduction'
        ];

        msg.map((str) => logger.info(str, { timestamp: true }));
      }

      if (config?.typeTranslationKeys) {
        saveKeyTypeToFile(keys.join('|'), config?.typeDestinationPath);
      }
    },
    handleHotUpdate(ctx: HmrContext) {
      const keys: string[] = [];

      if (config?.typeTranslationKeys) {
        pushKeys(keys, jsonLocales);
      }

      if (isPhpLocale) {
        if (/lang\/.*\.php$/.test(ctx.file)) {
          parser(langDirname);
        }

        if (config?.typeTranslationKeys) {
          pushKeys(keys, phpLocales);
        }
      }

      if (config?.typeTranslationKeys) {
        saveKeyTypeToFile(keys.join('|'), config?.typeDestinationPath);
      }
    }
  };
}
