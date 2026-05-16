import { describe, expect, test } from 'vitest';
import { runWorkspaceScan } from '../src/core/workspaceScan.js';
import { tempFixture } from './helpers.js';

async function scanWorkspace(files: Record<string, string>, inheritParentInstructions = false) {
  const root = await tempFixture(files);
  return runWorkspaceScan(root, {
    strict: false,
    include: [],
    exclude: [],
    maxDepth: 4,
    inheritParentInstructions
  });
}

describe('parent policy visibility', () => {
  test('child repo reports parent instructions when inheritance is disabled', async () => {
    const report = await scanWorkspace({
      'AGENTS.md': 'Do not run live traffic without explicit approval. Run `pnpm test` before release.',
      'packages/api/package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'packages/api/AGENTS.md': 'Run local tests for this package.'
    });

    const child = report.reports.find((entry) => entry.path === 'packages/api')?.report;
    const finding = child?.findings.find((item) => item.id === 'parent-policy-not-inherited');

    expect(finding).toMatchObject({
      severity: 'info',
      confidence: 'high',
      category: 'workspace-policy-visibility',
      primarySource: { file: 'AGENTS.md' }
    });
  });

  test('does not report when inheritance is enabled', async () => {
    const report = await scanWorkspace(
      {
        'AGENTS.md': 'Do not run live traffic without explicit approval. Run `pnpm test` before release.',
        'packages/api/package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
        'packages/api/AGENTS.md': 'Run local tests for this package.'
      },
      true
    );

    const child = report.reports.find((entry) => entry.path === 'packages/api')?.report;

    expect(child?.findings.map((finding) => finding.id)).not.toContain('parent-policy-not-inherited');
  });

  test('does not report when there are no parent instruction docs', async () => {
    const report = await scanWorkspace({
      'package.json': '{"packageManager":"pnpm@11.1.1"}',
      'packages/api/package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'packages/api/AGENTS.md': 'Run local tests for this package.'
    });

    const child = report.reports.find((entry) => entry.path === 'packages/api')?.report;

    expect(child?.findings.map((finding) => finding.id)).not.toContain('parent-policy-not-inherited');
  });

  test('does not report when parent instructions contain no policy boundary', async () => {
    const report = await scanWorkspace({
      'AGENTS.md': 'Run `pnpm test` before release.',
      'packages/api/package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'packages/api/AGENTS.md': 'Run local tests for this package.'
    });

    const child = report.reports.find((entry) => entry.path === 'packages/api')?.report;

    expect(child?.findings.map((finding) => finding.id)).not.toContain('parent-policy-not-inherited');
  });
});
