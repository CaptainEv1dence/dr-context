import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const actionPath = join(import.meta.dirname, '..', 'action.yml');

describe('GitHub Action wrapper', () => {
  test('writes a step summary and actionable SARIF failure diagnostics', async () => {
    const action = await readFile(actionPath, 'utf8');

    expect(action).toContain('GITHUB_STEP_SUMMARY');
    expect(action).toContain('Dr. Context did not produce SARIF. Check npm package install/execution above.');
  });
});
