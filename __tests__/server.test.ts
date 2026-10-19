// @vitest-environment node
import { getActiveLanguage, setLocale } from '../src/index.js';

// Without a document there is no <html lang> to read or update.
test('defaults to en and switches without touching a document on the server', async () => {
  expect(getActiveLanguage()).toBe('en');

  await setLocale('en');

  expect(getActiveLanguage()).toBe('en');
});
