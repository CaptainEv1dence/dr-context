import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('CI/doc command mismatch scan', () => {
  test('reports CI verification commands missing from agent-visible instructions without duplicate generic warnings', async () => {
    const report = await runScan(join(fixturesRoot, 'ci-doc-command-mismatch'), {
      strict: false,
      include: [],
      exclude: []
    });

    const findings = report.findings.filter((finding) => finding.id === 'ci-doc-command-mismatch');
    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.primarySource?.text)).toEqual(['pnpm run lint', 'corepack pnpm run typecheck']);
    expect(findings.map((finding) => finding.suggestion)).toEqual([
      'Add `pnpm run lint` to agent verification instructions so local agent checks match CI.',
      'Add `pnpm run typecheck` to agent verification instructions so local agent checks match CI.'
    ]);
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'ci-command',
          message: '.github/workflows/ci.yml:8 runs `pnpm run lint`.'
        }),
        expect.objectContaining({
          kind: 'agent-visible-command',
          message: 'No agent-visible instruction mentions `pnpm run lint` or `pnpm lint`.'
        }),
        expect.objectContaining({ kind: 'package-json-script', message: 'package.json defines script "lint".' })
      ])
    );

    expect(report.findings.filter((finding) => finding.id === 'missing-verification-command')).toHaveLength(0);
  });

  test('does not report CI commands when agent-visible instructions mention equivalent scripts', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'ci-doc-command-mismatch')).toHaveLength(0);
  });

  test('still reports CI commands when only non-agent docs mention equivalent scripts', async () => {
    const report = await runScan(join(fixturesRoot, 'ci-command-mentioned-only-in-adr'), {
      strict: false,
      include: [],
      exclude: []
    });

    const findings = report.findings.filter((finding) => finding.id === 'ci-doc-command-mismatch');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: '.github/workflows/ci.yml', line: 5, text: '- run: pnpm run lint' },
      suggestion: 'Add `pnpm run lint` to agent verification instructions so local agent checks match CI.'
    });
  });
});
