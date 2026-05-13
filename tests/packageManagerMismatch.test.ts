import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('package manager mismatch scan', () => {
  test('reports npm commands in docs when package.json declares pnpm', async () => {
    const report = await runScan(join(fixturesRoot, 'pnpm-repo-with-npm-docs'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary.errors).toBe(1);
    expect(report.findings).toHaveLength(1);

    const finding = report.findings[0];
    expect(finding).toMatchObject({
      id: 'package-manager-mismatch',
      category: 'package-manager',
      severity: 'error',
      confidence: 'high',
      primarySource: {
        file: 'AGENTS.md',
        line: 3,
        text: 'Run tests with `npm test`.'
      },
      suggestion: 'Replace `npm test` with `pnpm test`.'
    });

    expect(finding.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'command-mention',
          message: 'AGENTS.md:3 mentions `npm test`.'
        }),
        expect.objectContaining({
          kind: 'package-manager',
          message: 'package.json declares packageManager: pnpm@9.12.0.'
        }),
        expect.objectContaining({
          kind: 'lockfile',
          message: 'pnpm-lock.yaml indicates pnpm.'
        })
      ])
    );
  });

  test('does not report matching pnpm docs in the clean fixture', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary.errors).toBe(0);
    expect(report.findings).toHaveLength(0);
  });
});
