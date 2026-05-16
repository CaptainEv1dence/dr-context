import { join } from 'node:path';
import { discoverCandidates } from '../discovery/discoverCandidates.js';
import { extractAgentInstructionDocs } from '../extractors/agentInstructionDocs.js';
import { readWorkspace } from '../io/readWorkspace.js';
import { toolVersion } from '../version.js';
import { mapWithConcurrency } from './asyncPool.js';
import { runScan } from './runScan.js';
import { healthSummaryFromReports } from './health.js';
import { applySuppressions, withSuppressionResult } from './suppressions.js';
import type { AgentInstructionDocFact, EffectiveConfig, WorkspaceReport } from './types.js';

const defaultWorkspaceScanConcurrency = 2;

export async function runWorkspaceScan(root: string, config: EffectiveConfig & { maxDepth: number }): Promise<WorkspaceReport> {
  const discovery = await discoverCandidates(root, { maxDepth: config.maxDepth });
  const parentDocs = await parentInstructionDocs(root, config);
  const reports = await mapWithConcurrency(discovery.candidates, defaultWorkspaceScanConcurrency, async (candidate) => {
      const report = await runScan(candidate.path === '.' ? root : join(root, candidate.path), {
        ...config,
        inheritedAgentInstructionDocs: candidate.path === '.' || !config.inheritParentInstructions ? [] : parentDocs,
        parentAgentInstructionDocs: candidate.path === '.' || config.inheritParentInstructions ? undefined : parentDocs
      });
      const suppressions = [
        ...(config.suppressions ?? []),
        ...(config.workspaceBaselineSuppressions?.candidatePath === candidate.path ? config.workspaceBaselineSuppressions.suppressions : [])
      ];
      return {
        path: candidate.path,
        report: withSuppressionResult(report, applySuppressions(report.findings, suppressions))
      };
  });

  const summaryCounts = {
    roots: reports.length,
    errors: reports.reduce((total, entry) => total + entry.report.summary.errors, 0),
    warnings: reports.reduce((total, entry) => total + entry.report.summary.warnings, 0),
    infos: reports.reduce((total, entry) => total + entry.report.summary.infos, 0),
    suppressed: reports.reduce((total, entry) => total + (entry.report.summary.suppressed ?? 0), 0)
  };

  return {
    schemaVersion: 'drctx.workspace-report.v1',
    tool: 'drctx',
    toolVersion,
    root: '<requested-root>',
    reports,
    summary: {
      ...summaryCounts,
      health: healthSummaryFromReports(reports.map((entry) => entry.report))
    }
  };
}

async function parentInstructionDocs(root: string, config: EffectiveConfig): Promise<AgentInstructionDocFact[]> {
  const files = await readWorkspace(root, { include: config.include, exclude: config.exclude, limits: config.resourceLimits });

  return extractAgentInstructionDocs(files).map((doc) => ({
    ...doc,
    inherited: true,
    inheritedFrom: 'workspace-parent',
    displayPath: `<workspace-parent>/${doc.path}`,
    source: { ...doc.source, text: undefined }
  }));
}
