import type { Report, WorkspaceReport } from '../core/types.js';

export function renderWorkspaceJson(report: WorkspaceReport): string {
  return `${JSON.stringify(redactWorkspaceReport(report), null, 2)}\n`;
}

export type WorkspaceTextOptions = {
  summaryOnly?: boolean;
  maxFindings?: number;
};

export function renderWorkspaceText(report: WorkspaceReport, options: WorkspaceTextOptions = {}): string {
  const lines = [
    'Dr. Context Workspace',
    '',
    `Scanned ${report.summary.roots} candidate root(s).`,
    `Totals: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.infos} info(s).`,
    ''
  ];

  if (options.summaryOnly) {
    return `${lines.join('\n')}\n`;
  }

  let emittedFindings = 0;
  let omittedFindings = 0;
  for (const entry of report.reports) {
    lines.push(
      `${entry.path}: ${entry.report.summary.errors} error(s), ${entry.report.summary.warnings} warning(s), ${entry.report.summary.infos} info(s)`
    );

    for (const finding of entry.report.findings) {
      if (options.maxFindings !== undefined && emittedFindings >= options.maxFindings) {
        omittedFindings += 1;
        continue;
      }
      emittedFindings += 1;
      const location = finding.primarySource?.file
        ? `${entry.path}/${finding.primarySource.file}${finding.primarySource.line ? `:${finding.primarySource.line}` : ''}`
        : entry.path;
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.id}: ${finding.title} (${location})`);
      if (finding.suggestion) {
        lines.push(`  Suggested fix: ${finding.suggestion}`);
      }
    }
  }

  if (options.maxFindings !== undefined && omittedFindings > 0) {
    lines.push(`... ${omittedFindings} finding(s) omitted by --max-findings=${options.maxFindings}.`);
  }

  return `${lines.join('\n')}\n`;
}

function redactWorkspaceReport(report: WorkspaceReport): WorkspaceReport {
  return {
    ...report,
    root: '<requested-root>',
    reports: report.reports.map((entry) => ({
      path: entry.path,
      report: redactScanReport(entry.report)
    }))
  };
}

function redactScanReport(report: Report): Report {
  return {
    ...report,
    root: '<candidate-root>',
    inheritedInstructionFiles: report.inheritedInstructionFiles?.map((entry) => ({
      ...entry,
      source: redactSourceText(entry.source)
    })),
    findings: report.findings.map((finding) => ({
      ...finding,
      primarySource: finding.primarySource ? redactSourceText(finding.primarySource) : undefined,
      evidence: finding.evidence.map((entry) => ({
        ...entry,
        source: entry.source ? redactSourceText(entry.source) : undefined
      }))
    }))
  };
}

function redactSourceText<T extends { text?: string }>(source: T): T {
  const { text: _text, ...rest } = source;
  return rest as T;
}
