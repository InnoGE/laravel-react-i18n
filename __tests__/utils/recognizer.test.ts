import recognizer from '../../src/utils/recognizer.js';

const files = {
  '/lang/de.json': {},
  '/lang/php_de.json': {},
  '/lang/php_en.json': {},
  '/lang/readme.txt': {}
};

describe('recognizer', () => {
  it('lists JSON and PHP locales once, sorted', () => {
    expect(recognizer(files).getLocales()).toEqual(['de', 'en']);
  });

  it('tells JSON and PHP sources apart', () => {
    const { isJsonLocale, isPhpLocale, getJsonFile, getPhpFile } = recognizer(files);

    expect(isJsonLocale('en')).toBe(false);
    expect(isPhpLocale('en')).toBe(true);
    expect(getJsonFile('de')).toBe('/lang/de.json');
    expect(getPhpFile('de')).toBe('/lang/php_de.json');
  });

  it('rejects unknown locales', () => {
    expect(recognizer(files).isLocale('fr')).toBe(false);
  });
});
