import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { discoverCandidates } from '../src/discovery/discoverCandidates.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('repository candidate discovery', () => {
  test('discovers parent context roots, child git repositories, and package roots', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const report = await discoverCandidates(join(fixturesRoot, 'discover-workspace'), { maxDepth: 3 });

    expect(report).toMatchObject({
      schemaVersion: 'drctx.discover.v1',
      tool: 'drctx',
      toolVersion: '0.1.3',
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
});
