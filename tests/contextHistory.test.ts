import { afterEach, describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';
import { cleanupTempFixtures, tempFixture } from './helpers.js';

afterEach(async () => {
  await cleanupTempFixtures();
});

function datedPlanFiles(count: number): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      return [`docs/superpowers/plans/2026-05-${day}-slice.md`, `# Slice ${day}\n\nCompleted work notes.`];
    })
  );
}

async function scan(files: Record<string, string>) {
  return runScan(await tempFixture(files), { strict: false, include: [], exclude: [] });
}

describe('context history quality scan', () => {
  test('reports many dated superpowers history files without an index', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRead docs/superpowers/plans for past work.',
      ...datedPlanFiles(8)
    });

    const findings = report.findings.filter((finding) => finding.id === 'unindexed-context-history');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'info',
      confidence: 'medium',
      primarySource: { file: 'docs/superpowers/plans/2026-05-01-slice.md' },
      suggestion: 'Add docs/superpowers/README.md or docs/superpowers/current.md with active/current/done/shipped/superseded markers.'
    });
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'dated-context-history',
          message: 'Found 8 dated docs/superpowers history files without a current index.'
        })
      ])
    );
  });

  test('does not report dated history when a current index marks status', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRead docs/superpowers/current.md for active plans.',
      'docs/superpowers/current.md': '# Current\n\n- active: Slice 3\n- done: Slice 2',
      ...datedPlanFiles(8)
    });

    expect(report.findings.filter((finding) => finding.id === 'unindexed-context-history')).toHaveLength(0);
  });

  test('does not report small dated history even with related context words', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nReview dated plans, specs, reports, history, and current context.',
      ...datedPlanFiles(7)
    });

    expect(report.findings.filter((finding) => finding.id === 'unindexed-context-history')).toHaveLength(0);
  });
});
