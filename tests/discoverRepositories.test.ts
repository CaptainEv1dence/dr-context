import { afterEach, describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { discoverCandidates } from '../src/discovery/discoverCandidates.js';
import { toolVersion } from '../src/version.js';
import { cleanupTempFixtures, tempFixture } from './helpers.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

afterEach(async () => {
  await cleanupTempFixtures();
});

describe('repository candidate discovery', () => {
  test('discovers parent context roots, child git repositories, and package roots', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const report = await discoverCandidates(join(fixturesRoot, 'discover-workspace'), { maxDepth: 3 });

    expect(report).toMatchObject({
      schemaVersion: 'drctx.discover.v1',
      tool: 'drctx',
      toolVersion,
      root: '<requested-root>',
      maxDepth: 3,
      summary: { candidates: 3 }
    });
    expect(report.candidates).toEqual([
      { path: '.', type: 'agent-context-root', signals: ['AGENTS.md'] },
      { path: 'package-only', type: 'package-root', signals: ['package.json'] },
      { path: 'repo-a', type: 'git-repository', signals: ['.git', 'AGENTS.md', 'package.json'] }
    ]);
  });

  test('skips ignored directories and respects max depth', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const report = await discoverCandidates(join(fixturesRoot, 'discover-workspace'), { maxDepth: 1 });

    expect(report.candidates.map((candidate) => candidate.path)).toEqual(['.', 'package-only', 'repo-a']);
    expect(report.candidates.map((candidate) => candidate.path)).not.toContain('dist/generated-repo');
    expect(report.candidates.map((candidate) => candidate.path)).not.toContain('deep/level-1/level-2');
  });

  test('discovers package roots under a pnpm workspace root', async () => {
    const root = await tempFixture({
      'package.json': '{"private":true,"workspaces":["packages/*"]}',
      'pnpm-workspace.yaml': 'packages:\n  - packages/*\n',
      'packages/app/package.json': '{"name":"@example/app"}',
      'packages/app/README.md': '# App\n',
      'packages/lib/package.json': '{"name":"@example/lib"}',
      'packages/lib/README.md': '# Lib\n'
    });

    const report = await discoverCandidates(root, { maxDepth: 4 });

    expect(report.candidates.map((candidate) => candidate.path)).toEqual(['.', 'packages/app', 'packages/lib']);
    expect(report.candidates).toEqual([
      { path: '.', type: 'package-root', signals: ['package.json', 'pnpm-workspace.yaml'] },
      { path: 'packages/app', type: 'package-root', signals: ['package.json'] },
      { path: 'packages/lib', type: 'package-root', signals: ['package.json'] }
    ]);
  });
});
