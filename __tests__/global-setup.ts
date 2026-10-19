import { resolve } from 'path';
import parser from '../src/plugin/parser.js';

// Generates the php_*.json fixtures before any test file is transformed, so import.meta.glob sees parser output.
export default function setup(): void {
  parser(resolve('./__tests__/__mocks__/lang'));
}
