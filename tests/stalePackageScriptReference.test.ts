import { describe, expect, test } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-stale-script-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('stale package script reference scan', () => {
  test('reports docs commands that reference missing package scripts', async () => {
    const report = await runScan(join(fixturesRoot, 'missing-package-script'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary.errors).toBe(1);
    const findings = report.findings.filter((finding) => finding.id === 'stale-package-script-reference');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'stale-package-script-reference',
      category: 'package-script',
      severity: 'error',
      confidence: 'high',
      primarySource: {
        file: 'AGENTS.md',
        line: 3,
        text: 'Run unit tests with `pnpm run test:unit`.'
      },
      suggestion: 'Use `pnpm test` or add a "test:unit" script to package.json.'
    });

    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'command-mention',
          message: 'AGENTS.md:3 mentions `pnpm run test:unit`.'
        }),
        expect.objectContaining({
          kind: 'package-json-scripts',
          message: 'package.json scripts: lint, test.'
        })
      ])
    );
  });

  test('does not report existing scripts in the clean fixture', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.filter((finding) => finding.id === 'stale-package-script-reference')).toHaveLength(0);
  });

  test('does not report npm token hygiene commands as stale package scripts', async () => {
    const root = await makeRepo({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', scripts: { test: 'vitest run' } }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Run tests with `pnpm test`.',
      'SECURITY.md': 'If a token leaks, revoke it with `npm token revoke <token-id>`.'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.map((finding) => finding.id)).not.toContain('stale-package-script-reference');
  });
});
