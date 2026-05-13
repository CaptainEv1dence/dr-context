import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('missing verification command scan', () => {
  test('reports verification scripts missing from agent-visible instructions', async () => {
    const report = await runScan(join(fixturesRoot, 'missing-verification-command'), {
      strict: false,
      include: [],
      exclude: []
    });

    const findings = report.findings.filter((finding) => finding.id === 'missing-verification-command');
    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.primarySource?.text)).toEqual([
      '"lint": "eslint .",',
      '"typecheck": "tsc -p tsconfig.json --noEmit"'
    ]);
    expect(findings.map((finding) => finding.suggestion)).toEqual([
      'Add `pnpm run lint` to verification instructions.',
      'Add `pnpm run typecheck` to verification instructions.'
    ]);
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'package-json-script', message: 'package.json defines verification script "lint".' }),
        expect.objectContaining({
          kind: 'agent-visible-command',
          message: 'No agent-visible instruction mentions `pnpm run lint` or `pnpm lint`.'
        })
      ])
    );
  });

  test('does not report verification scripts mentioned by clean agent instructions', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'missing-verification-command')).toHaveLength(0);
  });

  test('uses lockfile package manager evidence for missing verification suggestions', async () => {
    const report = await runScan(join(fixturesRoot, 'npm-repo-missing-test-instructions'), {
      strict: false,
      include: [],
      exclude: []
    });

    const findings = report.findings.filter((finding) => finding.id === 'missing-verification-command');
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'package-manager',
          message: 'package-lock.json indicates npm.'
        })
      ])
    );
    expect(findings[0].suggestion).toBe('Add `npm test` to verification instructions.');
  });

  test('suggests direct tool commands for package scripts that wrap non-package-manager verification tools', async () => {
    const report = await runScan(join(fixturesRoot, 'foundry-repo-missing-test-instructions'), {
      strict: false,
      include: [],
      exclude: []
    });

    const findings = report.findings.filter((finding) => finding.id === 'missing-verification-command');
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBe('Add `forge test` to verification instructions.');
  });

  test('reports placeholder failing test scripts instead of suggesting them as verification commands', async () => {
    const report = await runScan(join(fixturesRoot, 'placeholder-test-script'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.filter((finding) => finding.id === 'missing-verification-command')).toHaveLength(0);
    const findings = report.findings.filter((finding) => finding.id === 'placeholder-test-script');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      suggestion: 'Replace the placeholder `test` script with a real verification command or remove it.'
    });
  });
});
