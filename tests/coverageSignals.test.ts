import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('coverage signal checks', () => {
  test('reports no scannable context instead of treating an empty repo as clean', async () => {
    const report = await runScan(join(fixturesRoot, 'no-scannable-context'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary).toEqual({ errors: 0, warnings: 0, infos: 1 });
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: 'no-scannable-context',
        severity: 'info',
        confidence: 'high',
        title: 'No supported context or repo fact files were found'
      })
    ]);
  });

  test('reports missing agent instructions when repo facts exist but no agent-visible instructions exist', async () => {
    const report = await runScan(join(fixturesRoot, 'no-agent-instructions'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.filter((finding) => finding.id === 'no-agent-instructions')).toEqual([
      expect.objectContaining({
        severity: 'info',
        confidence: 'high',
        suggestion: 'Add an AGENTS.md or another supported agent instruction file with exact verification commands and first-read docs.'
      })
    ]);
  });

  test('does not emit actionable warnings when no agent instructions exist', async () => {
    const report = await runScan(join(fixturesRoot, 'no-agent-instructions-with-test-script'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.map((finding) => finding.id)).toEqual(['no-agent-instructions']);
    expect(report.summary).toEqual({ errors: 0, warnings: 0, infos: 1 });
  });
});
