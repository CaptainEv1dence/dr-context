import { describe, expect, test } from 'vitest';
import { parsePackageScriptInvocation } from '../src/checks/packageScriptCommands.js';

describe('parsePackageScriptInvocation', () => {
  test.each([
    ['pnpm test', { manager: 'pnpm', scriptName: 'test', command: 'pnpm test', usesRun: false }],
    ['pnpm run lint', { manager: 'pnpm', scriptName: 'lint', command: 'pnpm run lint', usesRun: true }],
    ['npm run test:unit', { manager: 'npm', scriptName: 'test:unit', command: 'npm run test:unit', usesRun: true }],
    ['yarn test', { manager: 'yarn', scriptName: 'test', command: 'yarn test', usesRun: false }],
    ['bun run build', { manager: 'bun', scriptName: 'build', command: 'bun run build', usesRun: true }],
    [
      'corepack pnpm run typecheck',
      { manager: 'pnpm', scriptName: 'typecheck', command: 'corepack pnpm run typecheck', usesRun: true }
    ]
  ])('parses package script command %s', (command, expected) => {
    expect(parsePackageScriptInvocation(command)).toEqual(expected);
  });

  test.each(['pnpm install', 'npm ci', 'pnpm exec vitest', 'npx vitest', 'pnpm dlx create-vite', 'echo hi'])(
    'ignores non-script command %s',
    (command) => {
      expect(parsePackageScriptInvocation(command)).toBeUndefined();
    }
  );
});
