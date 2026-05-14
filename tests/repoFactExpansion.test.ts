import { describe, expect, test } from 'vitest';
import type { RawFile } from '../src/core/types.js';
import { extractBuildTargets } from '../src/extractors/buildTargets.js';
import { extractRuntimeVersions } from '../src/extractors/runtimeVersions.js';

describe('extractBuildTargets', () => {
  test('extracts Makefile, justfile, and Taskfile targets with source evidence', () => {
    const files: RawFile[] = [
      { path: 'Makefile', content: 'test:\n\tvitest run' },
      { path: 'justfile', content: 'lint:\n\tpnpm lint' },
      { path: 'Taskfile.yml', content: 'version: 3\ntasks:\n  build:\n    cmds:\n      - pnpm build' }
    ];

    expect(extractBuildTargets(files)).toEqual([
      {
        tool: 'make',
        name: 'test',
        source: { file: 'Makefile', line: 1 }
      },
      {
        tool: 'just',
        name: 'lint',
        source: { file: 'justfile', line: 1 }
      },
      {
        tool: 'taskfile',
        name: 'build',
        source: { file: 'Taskfile.yml', line: 3 }
      }
    ]);
  });
});

describe('extractRuntimeVersions', () => {
  test('extracts Node runtime versions with source evidence', () => {
    const files: RawFile[] = [
      { path: '.nvmrc', content: '24\n' },
      { path: '.node-version', content: '24.1.0\n' },
      { path: 'package.json', content: '{\n  "engines": {\n    "node": ">=24"\n  }\n}\n' },
      { path: '.github/workflows/ci.yml', content: 'jobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n' }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: '24',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 1 }
      },
      {
        runtime: 'node',
        version: '24.1.0',
        kind: 'node-version',
        source: { file: '.node-version', line: 1 }
      },
      {
        runtime: 'node',
        version: '>=24',
        kind: 'package-engines',
        source: { file: 'package.json', line: 3 }
      },
      {
        runtime: 'node',
        version: '24',
        kind: 'github-actions',
        source: { file: '.github/workflows/ci.yml', line: 6 }
      }
    ]);
  });
});
