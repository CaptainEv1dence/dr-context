import type { Report, WorkspaceReport } from '../core/types.js';

export type WorkspaceJsonOptions = {
  showSuppressed?: boolean;
};

export function renderWorkspaceJson(report: WorkspaceReport, options: WorkspaceJsonOptions = {}): string {
  return `${JSON.stringify(redactWorkspaceReport(report, options), null, 2)}\n`;
}

export type WorkspaceTextOptions = {
  summaryOnly?: boolean;
  maxFindings?: number;
  showSuppressed?: boolean;
};

export function renderWorkspaceText(report: WorkspaceReport, options: WorkspaceTextOptions = {}): string {
  const lines = [
    'Dr. Context Workspace',
    '',
    `Scanned ${report.summary.roots} candidate root(s).`,
    `Context health: ${report.summary.health.score}/100 (${report.summary.health.grade})`,
    `Totals: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.infos} info(s).`,
    ''
  ];
  if ((report.summary.suppressed ?? 0) > 0) {
    lines.splice(5, 0, `Suppressed findings: ${report.summary.suppressed}`);
  }

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
    if (options.showSuppressed && entry.report.suppressedFindings) {
      for (const finding of entry.report.suppressedFindings) {
        const location = finding.primarySource?.file
          ? `${entry.path}/${finding.primarySource.file}${finding.primarySource.line ? `:${finding.primarySource.line}` : ''}`
          : entry.path;
        lines.push(`- SUPPRESSED ${finding.id}: ${finding.title} (${location})`);
      }
    }
  }

  if (options.maxFindings !== undefined && omittedFindings > 0) {
    lines.push(`... ${omittedFindings} finding(s) omitted by --max-findings=${options.maxFindings}.`);
  }

  return `${lines.join('\n')}\n`;
}

function redactWorkspaceReport(report: WorkspaceReport, options: WorkspaceJsonOptions): WorkspaceReport {
  return {
    ...report,
    root: '<requested-root>',
    reports: report.reports.map((entry) => ({
      path: entry.path,
      report: redactScanReport(entry.report, options)
    }))
  };
}

function redactScanReport(report: Report, options: WorkspaceJsonOptions): Report {
  const redactedReport: Report = {
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
    })),
    suppressedFindings: options.showSuppressed
      ? report.suppressedFindings?.map((finding) => ({
          ...finding,
          primarySource: finding.primarySource ? redactSourceText(finding.primarySource) : undefined,
          evidence: finding.evidence.map((entry) => ({
            ...entry,
            source: entry.source ? redactSourceText(entry.source) : undefined
          }))
        }))
      : undefined
  };
  if (!options.showSuppressed) {
    delete redactedReport.suppressedFindings;
  }
  return redactedReport;
}

function redactSourceText<T extends { text?: string }>(source: T): T {
  const redacted = { ...source };
  delete redacted.text;
  return redacted;
}
