import { describe, expect, test } from 'vitest';
import { mergeWorkspaceChildConfig } from '../src/config/mergeConfig.js';
import type { LoadedConfig } from '../src/config/types.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadWorkspaceCandidateConfig } from '../src/config/workspaceConfig.js';

function config(input: Partial<LoadedConfig>): LoadedConfig {
  return { suppressions: [], ...input };
}

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-workspace-config-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
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

describe('loadWorkspaceCandidateConfig', () => {
  test('loads and merges child .drctx.json for workspace candidates', async () => {
    const root = await makeRepo({
      '.drctx.json': JSON.stringify({ exclude: ['dist/**'], strict: false, maxFiles: 100 }),
      'packages/app/.drctx.json': JSON.stringify({ exclude: ['vendor/**'], strict: true, maxFileBytes: 2048 })
    });
    const parent = config({ exclude: ['dist/**'], strict: false, resourceLimits: { maxFiles: 100 } });

    const result = await loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: false });

    expect(result.config.exclude).toEqual(['vendor/**']);
    expect(result.config.strict).toBe(true);
    expect(result.config.resourceLimits).toEqual({ maxFiles: 100, maxFileBytes: 2048 });
    expect(result.loadedChildConfigPath).toBe('packages/app/.drctx.json');
  });

  test('does not load child config when explicit --config is active', async () => {
    const root = await makeRepo({
      'packages/app/.drctx.json': JSON.stringify({ strict: true })
    });
    const parent = config({ strict: false });

    const result = await loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: true });

    expect(result.config.strict).toBe(false);
    expect(result.loadedChildConfigPath).toBeUndefined();
  });

  test('reports invalid child config with a candidate-relative path', async () => {
    const root = await makeRepo({
      'packages/app/.drctx.json': '{'
    });
    const parent = config({});

    const promise = loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: false });

    await expect(promise).rejects.toThrow('packages/app/.drctx.json');
    await expect(promise).rejects.not.toThrow(root);
  });

  test('does not load child config for dot-prefixed candidates', async () => {
    const root = await makeRepo({
      '.hidden/.drctx.json': JSON.stringify({ strict: true })
    });
    const parent = config({ strict: false });

    const result = await loadWorkspaceCandidateConfig(root, '.hidden', parent, { explicitConfig: false });

    expect(result.config.strict).toBe(false);
    expect(result.loadedChildConfigPath).toBeUndefined();
  });

  test('rejects candidate config paths outside the workspace root', async () => {
    const root = await makeRepo({});
    const parent = config({});

    await expect(loadWorkspaceCandidateConfig(root, '../outside', parent, { explicitConfig: false })).rejects.toThrow(
      'candidate paths must stay inside the workspace root'
    );
  });
});
