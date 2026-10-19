import fs from 'fs';

import { getPluralIndex } from '../../src/contrib/get-plural-index.js';

// One representative per plural rule, with numbers that separate the forms (CLDR examples).
const rules: [string, Record<number, number>][] = [
  ['ja', { 0: 0, 1: 0, 2: 0, 100: 0 }],
  ['en', { 0: 1, 1: 0, 2: 1, 21: 1 }],
  ['fr', { 0: 0, 1: 0, 2: 1 }],
  ['ru', { 1: 0, 2: 1, 4: 1, 5: 2, 11: 2, 12: 2, 21: 0, 22: 1, 111: 2 }],
  ['cs', { 1: 0, 3: 1, 5: 2 }],
  ['ga', { 1: 0, 2: 1, 3: 2 }],
  ['lt', { 1: 0, 2: 1, 10: 2, 11: 2, 12: 2, 21: 0, 22: 1 }],
  ['sl', { 1: 0, 101: 0, 102: 1, 103: 2, 104: 2, 105: 3 }],
  ['mk', { 1: 0, 11: 0, 21: 0, 2: 1 }],
  ['mt', { 1: 0, 0: 1, 5: 1, 102: 1, 11: 2, 19: 2, 20: 3 }],
  ['lv', { 0: 0, 1: 1, 21: 1, 11: 2, 5: 2 }],
  ['pl', { 1: 0, 2: 1, 22: 1, 5: 2, 12: 2, 21: 2 }],
  ['cy', { 1: 0, 2: 1, 8: 2, 11: 2, 3: 3 }],
  ['ro', { 1: 0, 0: 1, 19: 1, 101: 1, 20: 2 }],
  ['ar', { 0: 0, 1: 1, 2: 2, 3: 3, 10: 3, 11: 4, 99: 4, 100: 5 }]
];

describe('getPluralIndex', () => {
  it.each(rules)('picks the %s plural forms', (locale, expected) => {
    for (const [number, index] of Object.entries(expected)) {
      expect([number, getPluralIndex(locale, Number(number))]).toEqual([number, index]);
    }
  });

  it('strips the region and treats unknown locales as having one form', () => {
    expect(getPluralIndex('de_CH', 2)).toBe(1);
    expect(getPluralIndex('ru-RU', 21)).toBe(0);
    expect(getPluralIndex('xx', 2)).toBe(0);
  });

  // Every locale listed in the table maps to a rule that yields a valid form index.
  const listed = [...fs.readFileSync('src/contrib/get-plural-index.ts', 'utf8').matchAll(/case '(\w+)':/g)].map(
    ([, locale]) => locale
  );

  it.each(listed)('returns a form index for %s', (locale) => {
    for (let number = 0; number <= 120; number++) {
      expect(getPluralIndex(locale, number)).toBeGreaterThanOrEqual(0);
      expect(getPluralIndex(locale, number)).toBeLessThanOrEqual(5);
    }
  });
});
