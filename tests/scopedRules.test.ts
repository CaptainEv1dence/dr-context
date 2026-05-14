import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';
import { fixtureRoot } from './helpers.js';

const scopedRuleIds = ['invalid-scoped-rule-glob', 'scoped-rule-matches-no-files', 'scoped-rule-too-broad'];

describe('scoped rule checks', () => {
  test('valid Cursor globs match paths from filePaths and do not create no-match findings', async () => {
    const report = await runScan(fixtureRoot('scoped-rules'), { strict: false, include: [], exclude: [] });

    expect(report.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'scoped-rule-matches-no-files',
          primarySource: expect.objectContaining({ file: '.cursor/rules/src.mdc' })
        })
      ])
    );
  });

  test('invalid Cursor glob produces only an invalid-pattern finding for that pattern', async () => {
    const report = await runScan(fixtureRoot('scoped-rules'), { strict: false, include: [], exclude: [] });
    const invalidRuleFindings = report.findings.filter((finding) => finding.primarySource?.file === '.cursor/rules/invalid.mdc');

    expect(invalidRuleFindings).toEqual([
      expect.objectContaining({
        id: 'invalid-scoped-rule-glob',
        severity: 'warning',
        category: 'context-scope',
        confidence: 'high'
      })
    ]);
  });

  test('stale Cursor glob produces a no-match finding', async () => {
    const report = await runScan(fixtureRoot('scoped-rules'), { strict: false, include: [], exclude: [] });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'scoped-rule-matches-no-files',
          severity: 'info',
          category: 'context-scope',
          confidence: 'medium',
          primarySource: expect.objectContaining({ file: '.cursor/rules/no-match.mdc' })
        })
      ])
    );
  });

  test('broad Cursor glob produces a low-confidence info finding for larger repositories', async () => {
    const report = await runScan(fixtureRoot('scoped-rules-broad'), { strict: false, include: [], exclude: [] });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'scoped-rule-too-broad',
          severity: 'info',
          category: 'context-scope',
          confidence: 'low',
          primarySource: expect.objectContaining({ file: '.cursor/rules/broad.mdc' })
        })
      ])
    );
  });

  test('small repositories do not produce too-broad findings', async () => {
    const report = await runScan(fixtureRoot('scoped-rules-small-broad'), { strict: false, include: [], exclude: [] });

    expect(report.findings.map((finding) => finding.id)).not.toContain('scoped-rule-too-broad');
  });

  test('self-scan has no scoped-rule findings by default', async () => {
    const report = await runScan(process.cwd(), { strict: false, include: [], exclude: [] });

    expect(report.findings.map((finding) => finding.id)).not.toEqual(expect.arrayContaining(scopedRuleIds));
  });
});
