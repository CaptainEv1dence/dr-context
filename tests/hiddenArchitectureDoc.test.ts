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

  test('reports generic architecture mentions without exact architecture doc path', async () => {
    const report = await runScan(join(fixturesRoot, 'hidden-architecture-generic-mention'), { strict: false, include: [], exclude: [] });

    const findings = report.findings.filter((finding) => finding.id === 'hidden-architecture-doc');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: 'docs/ARCHITECTURE.md', line: 1, text: '# Architecture' },
      suggestion: 'Mention docs/ARCHITECTURE.md exactly in agent-visible first-read instructions.'
    });
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'generic-architecture-reference',
          message: 'Agent instructions mention architecture docs generically but do not name docs/ARCHITECTURE.md.',
          source: { file: 'AGENTS.md', line: 3, text: 'Read the architecture before changing core behavior.' }
        })
      ])
    );
  });

  test('treats architecture-only wording as a generic mention, not an exact path mention', async () => {
    const report = await runScan(join(fixturesRoot, 'hidden-architecture-generic-mention'), {
      strict: false,
      include: [],
      exclude: []
    });

    const finding = report.findings.find((item) => item.id === 'hidden-architecture-doc');
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'generic-architecture-reference',
          source: expect.objectContaining({ text: 'Read the architecture before changing core behavior.' })
        })
      ])
    );
  });
});
