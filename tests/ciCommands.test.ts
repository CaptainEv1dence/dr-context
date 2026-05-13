import { describe, expect, test } from 'vitest';
import { extractCiCommands } from '../src/extractors/ciCommands.js';
import type { RawFile } from '../src/core/types.js';

describe('extractCiCommands', () => {
  test('extracts GitHub Actions run commands with source evidence', () => {
    const files: RawFile[] = [
      {
        path: '.github/workflows/ci.yml',
        content: ['name: CI', 'jobs:', '  test:', '    steps:', '      - run: pnpm test'].join('\n')
      }
    ];

    expect(extractCiCommands(files)).toEqual([
      {
        command: 'pnpm test',
        context: 'plain-text',
        source: {
          file: '.github/workflows/ci.yml',
          line: 5,
          text: '- run: pnpm test'
        }
      }
    ]);
  });

  test('extracts individual commands from multiline run blocks', () => {
    const files: RawFile[] = [
      {
        path: '.github/workflows/ci.yaml',
        content: [
          'name: CI',
          'jobs:',
          '  test:',
          '    steps:',
          '      - run: |',
          '          pnpm install --frozen-lockfile',
          '          pnpm test',
          '          pnpm run typecheck'
        ].join('\n')
      }
    ];

    expect(extractCiCommands(files).map((command) => command.command)).toEqual([
      'pnpm install --frozen-lockfile',
      'pnpm test',
      'pnpm run typecheck'
    ]);
    expect(extractCiCommands(files)[2].source).toMatchObject({
      file: '.github/workflows/ci.yaml',
      line: 8,
      text: 'pnpm run typecheck'
    });
  });

  test('ignores uses steps and non-workflow YAML files', () => {
    const files: RawFile[] = [
      {
        path: '.github/workflows/ci.yml',
        content: ['jobs:', '  test:', '    steps:', '      - uses: actions/checkout@v4'].join('\n')
      },
      {
        path: 'docs/example.yml',
        content: 'run: pnpm test'
      }
    ];

    expect(extractCiCommands(files)).toEqual([]);
  });
});
