import { join } from 'node:path';
import { discoverCandidates } from '../discovery/discoverCandidates.js';
import { toolVersion } from '../version.js';
import { runScan } from './runScan.js';
import type { EffectiveConfig, WorkspaceReport } from './types.js';

export async function runWorkspaceScan(root: string, config: EffectiveConfig & { maxDepth: number }): Promise<WorkspaceReport> {
  const discovery = await discoverCandidates(root, { maxDepth: config.maxDepth });
  const reports = await Promise.all(
    discovery.candidates.map(async (candidate) => ({
      path: candidate.path,
      report: await runScan(candidate.path === '.' ? root : join(root, candidate.path), config)
    }))
  );

  return {
    schemaVersion: 'drctx.workspace-report.v1',
    tool: 'drctx',
    toolVersion,
    root: '<requested-root>',
    reports,
    summary: {
      roots: reports.length,
      errors: reports.reduce((total, entry) => total + entry.report.summary.errors, 0),
      warnings: reports.reduce((total, entry) => total + entry.report.summary.warnings, 0),
      infos: reports.reduce((total, entry) => total + entry.report.summary.infos, 0)
    }
  };
}
