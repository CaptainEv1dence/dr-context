import { describe, expect, test } from 'vitest';
import { mergeWorkspaceChildConfig } from '../src/config/mergeConfig.js';
import type { LoadedConfig } from '../src/config/types.js';

function config(input: Partial<LoadedConfig>): LoadedConfig {
  return { suppressions: [], ...input };
}

describe('workspace child config merging', () => {
  test('uses parent values when child is silent', () => {
    const parent = config({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
    const child = config({});

    expect(mergeWorkspaceChildConfig(parent, child)).toMatchObject({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
  });

  test('lets child replace include, exclude, strict, and individual resource limits', () => {
    const parent = config({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: false,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
    const child = config({
      include: ['package.json'],
      exclude: ['vendor/**'],
      strict: true,
      resourceLimits: { maxFiles: undefined, maxFileBytes: 4000, maxTotalBytes: undefined }
    });

    expect(mergeWorkspaceChildConfig(parent, child)).toMatchObject({
      include: ['package.json'],
      exclude: ['vendor/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 4000, maxTotalBytes: 3000 }
    });
  });

  test('appends child suppressions after parent suppressions', () => {
    const parent = config({ suppressions: [{ id: 'parent-rule', file: 'AGENTS.md' }] });
    const child = config({ suppressions: [{ id: 'child-rule', file: 'package.json' }] });

    expect(mergeWorkspaceChildConfig(parent, child).suppressions).toEqual([
      { id: 'parent-rule', file: 'AGENTS.md' },
      { id: 'child-rule', file: 'package.json' }
    ]);
  });

  test('does not inherit parent baseline into child candidates', () => {
    const parent = config({ baselinePath: '.drctx-baseline.json' });
    const child = config({});

    expect(mergeWorkspaceChildConfig(parent, child).baselinePath).toBeUndefined();
  });

  test('keeps child baseline when child defines one', () => {
    const parent = config({ baselinePath: '.drctx-baseline.json' });
    const child = config({ baselinePath: '.drctx-baseline.json' });

    expect(mergeWorkspaceChildConfig(parent, child).baselinePath).toBe('.drctx-baseline.json');
  });
});
