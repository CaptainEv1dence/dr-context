import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { ConfigUsageError, loadConfig } from '../src/config/loadConfig.js';
import { fixtureRoot } from './helpers.js';

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-config-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('loadConfig', () => {
  test('loads .drctx.json from the requested root with exclude, strict, and baseline file', async () => {
    const root = await makeRepo({
      '.drctx.json': JSON.stringify({ exclude: ['vendor/**'], strict: true, baseline: '.drctx-baseline.json' }),
      '.drctx-baseline.json': JSON.stringify({
        schemaVersion: 'drctx.baseline.v1',
        tool: 'drctx',
        root: '<requested-root>',
        findings: [{ fingerprint: 'sha256:abc', id: 'missing-verification-command', file: 'package.json' }]
      })
    });

    const config = await loadConfig(root, {});

    expect(config.exclude).toEqual(['vendor/**']);
    expect(config.strict).toBe(true);
    expect(config.baselinePath).toBe('.drctx-baseline.json');
    expect(config.baseline?.findings).toEqual([
      { fingerprint: 'sha256:abc', id: 'missing-verification-command', file: 'package.json' }
    ]);
  });

  test('uses explicit --config path inside root', async () => {
    const root = await makeRepo({ 'configs/drctx.json': JSON.stringify({ include: ['AGENTS.md'] }) });

    const config = await loadConfig(root, { configPath: 'configs/drctx.json' });

    expect(config.include).toEqual(['AGENTS.md']);
  });

  test('rejects config paths outside root', async () => {
    const root = await makeRepo({});

    await expect(loadConfig(root, { configPath: '../outside.json' })).rejects.toBeInstanceOf(ConfigUsageError);
  });

  test('rejects unknown keys', async () => {
    const root = await makeRepo({ '.drctx.json': JSON.stringify({ nope: true }) });

    await expect(loadConfig(root, {})).rejects.toThrow(/unknown config key/i);
  });

  test('rejects invalid suppression shape', async () => {
    const root = await makeRepo({ '.drctx.json': JSON.stringify({ suppressions: [{ id: 'x' }] }) });

    await expect(loadConfig(root, {})).rejects.toThrow(/file or fingerprint/i);
  });

  test('returns empty config when no config file exists', async () => {
    const root = await makeRepo({});

    await expect(loadConfig(root, {})).resolves.toEqual({ suppressions: [] });
  });

  test('validates baseline schemaVersion, tool, and findings array', async () => {
    const root = await makeRepo({
      '.drctx.json': JSON.stringify({ baseline: '.drctx-baseline.json' }),
      '.drctx-baseline.json': JSON.stringify({ schemaVersion: 'wrong', tool: 'drctx', root: '<requested-root>', findings: [] })
    });

    await expect(loadConfig(root, {})).rejects.toThrow(/baseline/i);
  });

  test('loads the committed config-baseline fixture', async () => {
    const config = await loadConfig(fixtureRoot('config-baseline'), {});

    expect(config.exclude).toEqual(['vendor/**']);
    expect(config.strict).toBe(true);
    expect(config.baseline?.findings).toHaveLength(1);
  });

  test('rejects the committed config-invalid fixture', async () => {
    await expect(loadConfig(fixtureRoot('config-invalid'), {})).rejects.toBeInstanceOf(ConfigUsageError);
  });
});
