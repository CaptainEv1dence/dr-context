import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

const actionPath = join(import.meta.dirname, '..', 'action.yml');

type GitHubAction = {
  inputs?: Record<string, unknown>;
  runs?: {
    steps?: Array<{
      if?: string;
      uses?: string;
      with?: Record<string, unknown>;
    }>;
  };
};

const readAction = async () => (await readFile(actionPath, 'utf8'));
const parseAction = async () => parse(await readAction()) as GitHubAction;

describe('GitHub Action wrapper', () => {
  test('keeps stable public inputs without legacy sarif input', async () => {
    const action = await parseAction();

    expect(Object.keys(action.inputs ?? {})).toEqual(['root', 'strict', 'upload-sarif', 'version']);
  });

  test('writes a step summary and actionable SARIF failure diagnostics', async () => {
    const action = await readAction();

    expect(action).toContain('GITHUB_STEP_SUMMARY');
    expect(action).toContain('Dr. Context did not produce valid SARIF. Check npm package install/execution above.');
  });

  test('emits GitHub annotations from SARIF results', async () => {
    const action = await readAction();

    expect(action).toContain('escapeProperty');
    expect(action).toContain("replace(/:/g,'%3A')");
    expect(action).toContain("replace(/,/g,'%2C')");
    expect(action).toContain('result.locations?.[0]?.physicalLocation');
    expect(action).toContain("result.level === 'error' ? 'error' : 'warning'");
  });

  test('passes action inputs through environment variables before shell use', async () => {
    const action = await readAction();

    expect(action).toContain('DR_CONTEXT_ROOT: ${{ inputs.root }}');
    expect(action).toContain('DR_CONTEXT_VERSION: ${{ inputs.version }}');
    expect(action).toContain('--package "dr-context@$DR_CONTEXT_VERSION"');
    expect(action).toContain('dr-context check --sarif --root "$DR_CONTEXT_ROOT"');
    expect(action).toContain('"$DR_CONTEXT_ROOT"');
    expect(action).not.toContain('"${{ inputs.root }}"');
    expect(action).not.toContain('dr-context@${{ inputs.version }}');
  });

  test('preserves SARIF upload gating', async () => {
    const action = await parseAction();
    const uploadStep = action.runs?.steps?.find((step) => step.uses?.startsWith('github/codeql-action/upload-sarif@'));

    expect(uploadStep).toBeDefined();
    expect(uploadStep?.uses).toBe('github/codeql-action/upload-sarif@v4');
    expect(uploadStep?.if).toContain('always()');
    expect(uploadStep?.if).toContain("inputs.upload-sarif == 'true'");
    expect(uploadStep?.if).toContain("steps.scan.outputs.sarif_ready == 'true'");
    expect(uploadStep?.with?.sarif_file).toBe('dr-context.sarif');
  });
});
