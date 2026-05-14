import type { Report, WorkspaceReport } from '../core/types.js';

export function renderWorkspaceJson(report: WorkspaceReport): string {
  return `${JSON.stringify(redactWorkspaceReport(report), null, 2)}\n`;
}

export function renderWorkspaceText(report: WorkspaceReport): string {
  const lines = [
    'Dr. Context Workspace',
    '',
    `Scanned ${report.summary.roots} candidate root(s).`,
    `Totals: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.infos} info(s).`,
    ''
  ];

  for (const entry of report.reports) {
    lines.push(
      `${entry.path}: ${entry.report.summary.errors} error(s), ${entry.report.summary.warnings} warning(s), ${entry.report.summary.infos} info(s)`
    );

    for (const finding of entry.report.findings) {
      const location = finding.primarySource?.file
        ? `${entry.path}/${finding.primarySource.file}${finding.primarySource.line ? `:${finding.primarySource.line}` : ''}`
        : entry.path;
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.id}: ${finding.title} (${location})`);
      if (finding.suggestion) {
        lines.push(`  Suggested fix: ${finding.suggestion}`);
      }
    }
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
    root: '<candidate-root>'
  };
}
