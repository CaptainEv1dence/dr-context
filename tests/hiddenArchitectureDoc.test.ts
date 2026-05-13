import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

describe('hidden architecture doc scan', () => {
  test('reports architecture docs not mentioned by agent-visible instructions', async () => {
    const report = await runScan(join(fixturesRoot, 'hidden-architecture-doc'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]).toMatchObject({
      id: 'hidden-architecture-doc',
      category: 'architecture-doc',
      severity: 'warning',
      confidence: 'high',
      primarySource: { file: 'ARCHITECTURE.md', line: 1, text: '# Architecture' },
      suggestion: 'Mention ARCHITECTURE.md in agent-visible first-read instructions.'
    });
    expect(report.findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'architecture-doc',
          message: 'ARCHITECTURE.md appears to be an architecture source of truth.'
        }),
        expect.objectContaining({
          kind: 'agent-instructions',
          message: 'Agent-visible instructions do not mention ARCHITECTURE.md.'
        })
      ])
    );
  });

  test('does not report architecture docs mentioned by clean agent instructions', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'hidden-architecture-doc')).toHaveLength(0);
  });
});
