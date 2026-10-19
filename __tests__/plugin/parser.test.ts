import fs from 'fs';
import { mock } from '../setup.js';
import parser from '../../src/plugin/parser.js';

const result = [
  {
    basename: 'php_en.json',
    path: `${mock('lang')}/php_en.json`
  },
  {
    basename: 'php_fr.json',
    path: `${mock('lang')}/php_fr.json`
  },
  {
    basename: 'php_it.json',
    path: `${mock('lang')}/php_it.json`
  }
];

describe('parser', () => {
  it.each([
    [mock('lang'), result],
    [mock('langError'), []]
  ])('parse php-file', (dirname, expected) => {
    expect(parser(dirname)).toMatchObject(expected);
  });
});

it('skips files that are not PHP', () => {
  parser(mock('lang'));

  const parsed = JSON.parse(fs.readFileSync(`${mock('lang')}/php_en.json`, 'utf8'));

  expect(Object.keys(parsed).some((key) => key.startsWith('notes'))).toBe(false);
});
