import { describe, expect, test } from 'vitest';
import type { RawFile } from '../src/core/types.js';
import { extractBuildTargets } from '../src/extractors/buildTargets.js';
import { extractMarkdownCommands } from '../src/extractors/markdownCommands.js';
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

  test('ignores Makefile and justfile assignment-like lines', () => {
    const files: RawFile[] = [
      { path: 'Makefile', content: 'VERSION := 1.2.3\nFOO ?= bar\nNAME ::= value\ntest:\n\tpnpm test' },
      { path: 'justfile', content: 'version := "1.2.3"\nlint:\n\tpnpm lint' }
    ];

    expect(extractBuildTargets(files)).toEqual([
      {
        tool: 'make',
        name: 'test',
        source: { file: 'Makefile', line: 4 }
      },
      {
        tool: 'just',
        name: 'lint',
        source: { file: 'justfile', line: 2 }
      }
    ]);
  });
});

describe('extractMarkdownCommands', () => {
  test('extracts corepack pnpm commands with normalized package manager intent', () => {
    const files: RawFile[] = [
      { path: 'AGENTS.md', content: 'Run `corepack pnpm test` and `corepack pnpm@11.1.1 lint`.' }
    ];

    expect(extractMarkdownCommands(files)).toEqual([
      {
        command: 'corepack pnpm test',
        packageManager: 'pnpm',
        context: 'inline-code',
        source: { file: 'AGENTS.md', line: 1, text: 'Run `corepack pnpm test` and `corepack pnpm@11.1.1 lint`.' }
      },
      {
        command: 'corepack pnpm@11.1.1 lint',
        packageManager: 'pnpm',
        context: 'inline-code',
        source: { file: 'AGENTS.md', line: 1, text: 'Run `corepack pnpm test` and `corepack pnpm@11.1.1 lint`.' }
      }
    ]);
  });

  test('does not extract corepack enable as package manager command evidence', () => {
    const files: RawFile[] = [{ path: 'AGENTS.md', content: 'Run `corepack enable` before install.' }];

    expect(extractMarkdownCommands(files)).toEqual([]);
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
        normalizedMajor: 24,
        confidence: 'high',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 1 }
      },
      {
        runtime: 'node',
        version: '24.1.0',
        normalizedMajor: 24,
        confidence: 'high',
        kind: 'node-version',
        source: { file: '.node-version', line: 1 }
      },
      {
        runtime: 'node',
        version: '>=24',
        minimumMajor: 24,
        confidence: 'medium',
        kind: 'package-engines',
        source: { file: 'package.json', line: 3 }
      },
      {
        runtime: 'node',
        version: '24',
        normalizedMajor: 24,
        confidence: 'high',
        kind: 'github-actions',
        source: { file: '.github/workflows/ci.yml', line: 6 }
      }
    ]);
  });

  test('reports actual line for runtime dotfiles with leading blank lines', () => {
    const files: RawFile[] = [
      { path: '.nvmrc', content: '\n24\n' },
      { path: '.node-version', content: '\n24.1.0\n' }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: '24',
        normalizedMajor: 24,
        confidence: 'high',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 2 }
      },
      {
        runtime: 'node',
        version: '24.1.0',
        normalizedMajor: 24,
        confidence: 'high',
        kind: 'node-version',
        source: { file: '.node-version', line: 2 }
      }
    ]);
  });

  test('normalizes supported Node runtime version forms while preserving raw values and source spans', () => {
    const files: RawFile[] = [
      { path: '.nvmrc', content: 'v20.11.1\n' },
      { path: '.node-version', content: '20.x\n' },
      { path: 'package.json', content: '{\n  "engines": {\n    "node": ">=20"\n  }\n}\n' },
      {
        path: '.github/workflows/ci.yml',
        content:
          'jobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: "20.*"\n'
      }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: 'v20.11.1',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 1 }
      },
      {
        runtime: 'node',
        version: '20.x',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'node-version',
        source: { file: '.node-version', line: 1 }
      },
      {
        runtime: 'node',
        version: '>=20',
        minimumMajor: 20,
        confidence: 'medium',
        kind: 'package-engines',
        source: { file: 'package.json', line: 3 }
      },
      {
        runtime: 'node',
        version: '20.*',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'github-actions',
        source: { file: '.github/workflows/ci.yml', line: 6 }
      }
    ]);
  });

  test('normalizes two-part static Node versions and minimum patch ranges', () => {
    const files: RawFile[] = [
      { path: '.nvmrc', content: '20.11\n' },
      { path: '.node-version', content: 'v20.11\n' },
      { path: 'package.json', content: '{\n  "engines": {\n    "node": ">=20.0.0"\n  }\n}\n' }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: '20.11',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 1 }
      },
      {
        runtime: 'node',
        version: 'v20.11',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'node-version',
        source: { file: '.node-version', line: 1 }
      },
      {
        runtime: 'node',
        version: '>=20.0.0',
        minimumMajor: 20,
        confidence: 'medium',
        kind: 'package-engines',
        source: { file: 'package.json', line: 3 }
      }
    ]);
  });

  test('extracts setup-node node-version when with block appears before uses in the same step', () => {
    const files: RawFile[] = [
      {
        path: '.github/workflows/ci.yml',
        content: 'jobs:\n  test:\n    steps:\n      - with:\n          node-version: 20\n        uses: actions/setup-node@v4\n'
      }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: '20',
        normalizedMajor: 20,
        confidence: 'high',
        kind: 'github-actions',
        source: { file: '.github/workflows/ci.yml', line: 5 }
      }
    ]);
  });

  test('marks unsupported dynamic Node runtime values while preserving raw values and source spans', () => {
    const files: RawFile[] = [
      { path: '.nvmrc', content: 'lts/*\n' },
      { path: '.node-version', content: 'latest\n' },
      { path: 'package.json', content: '{\n  "engines": {\n    "node": "node"\n  }\n}\n' },
      {
        path: '.github/workflows/ci.yml',
        content:
          'jobs:\n  test:\n    strategy:\n      matrix:\n        node-version: [20, 22]\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          node-version: ${{ matrix.node-version }}\n'
      }
    ];

    expect(extractRuntimeVersions(files)).toEqual([
      {
        runtime: 'node',
        version: 'lts/*',
        unsupportedReason: 'dynamic',
        kind: 'nvmrc',
        source: { file: '.nvmrc', line: 1 }
      },
      {
        runtime: 'node',
        version: 'latest',
        unsupportedReason: 'dynamic',
        kind: 'node-version',
        source: { file: '.node-version', line: 1 }
      },
      {
        runtime: 'node',
        version: 'node',
        unsupportedReason: 'dynamic',
        kind: 'package-engines',
        source: { file: 'package.json', line: 3 }
      },
      {
        runtime: 'node',
        version: '${{ matrix.node-version }}',
        unsupportedReason: 'dynamic',
        kind: 'github-actions',
        source: { file: '.github/workflows/ci.yml', line: 9 }
      }
    ]);
  });
});
