import { describe, expect, test } from 'vitest';
import { runWorkspaceScan } from '../src/core/workspaceScan.js';
import { renderWorkspaceJson } from '../src/reporting/workspaceReporter.js';
import { fixtureRoot } from './helpers.js';

describe('workspace parent instruction inheritance', () => {
  test('does not inherit parent instructions by default', async () => {
    const report = await runWorkspaceScan(fixtureRoot('workspace-inheritance'), {
      strict: false,
      include: [],
      exclude: [],
      maxDepth: 4
    });

    const childReport = report.reports.find((entry) => entry.path === 'packages/api')?.report;

    expect(childReport).toBeDefined();
    expect(childReport?.inheritedInstructionFiles ?? []).toEqual([]);
  });

  test('inherits parent instructions when enabled', async () => {
    const report = await runWorkspaceScan(fixtureRoot('workspace-inheritance'), {
      strict: false,
      include: [],
      exclude: [],
      maxDepth: 4,
      inheritParentInstructions: true
    });

    const childReport = report.reports.find((entry) => entry.path === 'packages/api')?.report;

    expect(childReport?.inheritedInstructionFiles).toEqual([
      expect.objectContaining({
        path: 'AGENTS.md',
        inherited: true,
        inheritedFrom: 'workspace-parent',
        displayPath: '<workspace-parent>/AGENTS.md'
      })
    ]);
  });

  test('redacts inherited workspace instruction source text in JSON', async () => {
    const report = await runWorkspaceScan(fixtureRoot('workspace-inheritance'), {
      strict: false,
      include: [],
      exclude: [],
      maxDepth: 4,
      inheritParentInstructions: true
    });
    const json = renderWorkspaceJson(report);

    expect(json).toContain('"inherited": true');
    expect(json).toContain('<workspace-parent>/AGENTS.md');
    expect(json).not.toContain('Run `pnpm test` before release.');
    expect(json).not.toContain('packages/api/AGENTS.md');
  });
});
