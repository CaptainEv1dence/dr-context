import type { Evidence, Finding, Report, SourceSpan, SuppressedFinding } from '../core/types.js';

export type TextReportOptions = {
  showSuppressed?: boolean;
};

export function renderText(report: Report, options: TextReportOptions = {}): string {
  const suppressed = report.summary.suppressed ?? 0;
  if (report.findings.length === 0) {
    const lines = ['Dr. Context', '', renderHealth(report.summary.health), '', 'No context rot found.'];
    appendSuppressed(lines, report, options);
    return `${lines.join('\n')}\n`;
  }

  const lines = ['Dr. Context', '', renderHealth(report.summary.health), '', `Found ${report.findings.length} finding(s).`, ''];

  for (const [index, finding] of report.findings.entries()) {
    lines.push(renderFinding(finding, index + 1), '');
  }

  if (suppressed > 0) {
    appendSuppressed(lines, report, options);
  }

  return `${lines.join('\n')}\n`;
}

function renderFinding(finding: Finding, index: number): string {
  const lines = [
    `${index}. ${finding.severity.toUpperCase()} ${finding.id} (${finding.confidence})`,
    `${formatSource(finding.primarySource)} - ${finding.title}`
  ];

  if (finding.evidence.length > 0) {
    lines.push('', 'Evidence:', ...finding.evidence.map(renderEvidenceItem));
  }

  if (finding.suggestion) {
    lines.push('', 'Suggested fix:', `- ${finding.suggestion}`);
  }

  return lines.join('\n');
}

function renderHealth(health: Report['summary']['health']): string {
  return `Context health: ${health.score}/100 (${health.grade})`;
}

function renderEvidenceItem(evidence: Evidence): string {
  return `- ${evidence.message}`;
}

function formatSource(source?: SourceSpan): string {
  if (!source) {
    return 'unknown source';
  }

  return `${source.file}${source.line ? `:${source.line}` : ''}`;
}

function appendSuppressed(lines: string[], report: Report, options: TextReportOptions): void {
  const suppressed = report.summary.suppressed ?? 0;
  if (suppressed === 0) {
    return;
  }

  lines.push('', `Suppressed findings: ${suppressed}`);
  if (!options.showSuppressed || !report.suppressedFindings) {
    return;
  }

  lines.push('', 'Suppressed:');
  for (const [index, finding] of report.suppressedFindings.entries()) {
    lines.push(renderSuppressedFinding(finding, index + 1));
  }
}

function renderSuppressedFinding(finding: SuppressedFinding, index: number): string {
  const reason = finding.suppression.reason ? ` - ${finding.suppression.reason}` : '';
  return `${index}. ${finding.id} ${formatSource(finding.primarySource)}${reason}`;
}
