import { mock } from '../setup.js';

import locale from '../../src/plugin/locale.js';

const jsonLocales = ['de', 'en', 'nl', 'uk'];
const phpLocales = ['en', 'fr', 'it'];

describe('locale', () => {
  it.each([
    [mock('lang'), jsonLocales],
    [mock('langError'), []]
  ])('getJsonLocale', (dirname, expected) => {
    expect(locale.getJsonLocale(dirname)).toMatchObject(expected);
  });

  it.each([
    [mock('lang'), phpLocales],
    [mock('langError'), []]
  ])('getJsonLocale', (dirname, expected) => {
    expect(locale.getPhpLocale(dirname)).toMatchObject(expected);
  });
});
