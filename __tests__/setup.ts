import fs from 'fs';
import { resolve } from 'path';

const clientFile: any = {};
const serverFile: any = {};

const mock = (dirName: string) => resolve(`./__tests__/__mocks__/${dirName}`);

beforeAll(() => {
  // global-setup.ts has generated the php_*.json files already.
  const dirName = mock('lang');

  fs.readdirSync(dirName)
    .filter((basename) => !fs.statSync(dirName + '/' + basename).isDirectory() && basename.endsWith('.json'))
    .forEach((file) => {
      const path = dirName + '/' + file;
      clientFile[path] = import(path);
      serverFile[path] = JSON.parse(fs.readFileSync(path, 'utf8'));
    });
});

export { clientFile, serverFile, mock };
