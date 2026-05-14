import { describe, expect, test } from 'vitest';
import { classifyCiCommand } from '../src/extractors/ciCommandClassifier.js';
import { extractCiCommands } from '../src/extractors/ciCommands.js';

describe('CI command classification', () => {
  test('classifies shell plumbing separately from verification commands', () => {
    expect(classifyCiCommand('pnpm test')).toBe('verification');
    expect(classifyCiCommand('corepack pnpm run typecheck')).toBe('verification');
    expect(classifyCiCommand('pnpm install --frozen-lockfile')).toBe('install');
    expect(classifyCiCommand('npm publish --access public')).toBe('publish');
    expect(classifyCiCommand('actions/setup-node@v6')).toBe('setup');
    expect(classifyCiCommand('if [ "$STATUS" -ne 0 ]; then')).toBe('shell-control');
    expect(classifyCiCommand('else')).toBe('shell-control');
    expect(classifyCiCommand('fi')).toBe('shell-control');
    expect(classifyCiCommand('echo "hello"')).toBe('output-plumbing');
    expect(classifyCiCommand('exit 1')).toBe('shell-control');
  });

  test('adds classification to extracted workflow run commands', () => {
    const commands = extractCiCommands([
      {
        path: '.github/workflows/ci.yml',
        content: 'jobs:\n  test:\n    steps:\n      - run: |\n          pnpm test\n          if [ "$?" -ne 0 ]; then\n            echo "failed"\n            exit 1\n          fi\n'
      }
    ]);

    expect(commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: 'pnpm test', classification: 'verification' }),
        expect.objectContaining({ command: 'if [ "$?" -ne 0 ]; then', classification: 'shell-control' }),
        expect.objectContaining({ command: 'echo "failed"', classification: 'output-plumbing' })
      ])
    );
  });
});
