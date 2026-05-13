import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

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
});
