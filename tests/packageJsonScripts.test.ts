import { describe, expect, test } from 'vitest';
import { extractPackageJsonScripts } from '../src/extractors/packageJsonScripts.js';
import type { RawFile } from '../src/core/types.js';

describe('extractPackageJsonScripts', () => {
  test('extracts package scripts with source evidence', () => {
    const files: RawFile[] = [
      {
        path: 'package.json',
        content: '{\n  "scripts": {\n    "test": "vitest run",\n    "lint": "eslint ."\n  }\n}\n'
      }
    ];

    expect(extractPackageJsonScripts(files)).toEqual([
      {
        name: 'test',
        command: 'vitest run',
        source: { file: 'package.json', line: 3, text: '"test": "vitest run",' }
      },
      {
        name: 'lint',
        command: 'eslint .',
        source: { file: 'package.json', line: 4, text: '"lint": "eslint ."' }
      }
    ]);
  });

  test('returns no scripts when package.json has none', () => {
    expect(extractPackageJsonScripts([{ path: 'package.json', content: '{ "name": "empty" }' }])).toEqual([]);
  });
});
