import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const actionPath = join(import.meta.dirname, '..', 'action.yml');

describe('GitHub Action wrapper', () => {
  test('writes a step summary and actionable SARIF failure diagnostics', async () => {
    const action = await readFile(actionPath, 'utf8');

    expect(action).toContain('GITHUB_STEP_SUMMARY');
    expect(action).toContain('Dr. Context did not produce valid SARIF. Check npm package install/execution above.');
  });

  test('emits GitHub annotations from SARIF results', async () => {
    const action = await readFile(actionPath, 'utf8');

    expect(action).toContain('escapeProperty');
    expect(action).toContain("replace(/:/g,'%3A')");
    expect(action).toContain("replace(/,/g,'%2C')");
    expect(action).toContain('result.locations?.[0]?.physicalLocation');
    expect(action).toContain("result.level === 'error' ? 'error' : 'warning'");
  });

  test('passes action inputs through environment variables before shell use', async () => {
    const action = await readFile(actionPath, 'utf8');

    expect(action).toContain('DR_CONTEXT_ROOT: ${{ inputs.root }}');
    expect(action).toContain('DR_CONTEXT_VERSION: ${{ inputs.version }}');
    expect(action).toContain('"$DR_CONTEXT_ROOT"');
    expect(action).not.toContain('"${{ inputs.root }}"');
    expect(action).not.toContain('dr-context@${{ inputs.version }}');
  });
});
