import type { Evidence, Finding, Report, SourceSpan, SuppressedFinding } from '../core/types.js';

export type TextReportOptions = {
  showSuppressed?: boolean;
};

export function renderText(report: Report, options: TextReportOptions = {}): string {
  const suppressed = report.summary.suppressed ?? 0;
  if (report.findings.length === 0) {
    const lines = [
      'Dr. Context',
      '',
      renderHealth(report.summary.health),
      '',
      'No context rot found.',
      'Next: run `drctx manifest --root .` to inspect recognized context.'
    ];
    appendScanResourceGuidance(lines, report);
    appendSuppressed(lines, report, options);
    return `${lines.join('\n')}\n`;
  }

  const lines = ['Dr. Context', '', renderHealth(report.summary.health), '', `Found ${report.findings.length} finding(s).`, ''];
  appendScanResourceGuidance(lines, report);
  if (report.scanResource?.hitLimit) {
    lines.push('');
  }

  for (const [index, finding] of report.findings.entries()) {
    lines.push(renderFinding(finding, index + 1), '');
  }

  appendCoverageGuidance(lines, report.findings);

  if (suppressed > 0) {
    appendSuppressed(lines, report, options);
  }

  return `${lines.join('\n')}\n`;
}

function renderFinding(finding: Finding, index: number): string {
  const lines = [
    `${index}. ${finding.severity.toUpperCase()} ${finding.id} (${finding.confidence})`,
    `${formatSource(finding.primarySource)} - ${finding.title}`,
    `Why: ${finding.title}`
  ];

  if (finding.suggestion && !usesCoverageGuidance(finding)) {
    lines.push(`Fix: ${finding.suggestion}`);
  }

  if (finding.evidence.length > 0) {
    lines.push('', 'Evidence:', ...finding.evidence.map(renderEvidenceItem));
  }

  if (finding.suggestion && !usesCoverageGuidance(finding)) {
    lines.push('', 'Suggested fix:', `- ${finding.suggestion}`);
  }

  return lines.join('\n');
}

function appendScanResourceGuidance(lines: string[], report: Report): void {
  if (!report.scanResource?.hitLimit) {
    return;
  }

  lines.push(
    '',
    `Scan resource limits: skipped ${report.scanResource.skippedFiles.length} context file(s). Results may be incomplete.`,
    'Next: narrow the scan with --exclude or scan a package root.'
  );
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

function appendCoverageGuidance(lines: string[], visibleFindings: Finding[]): void {
  if (visibleFindings.some((finding) => finding.id === 'no-scannable-context')) {
    lines.push('Check the --root path. Dr. Context did not find supported context files there.');
  }

  if (visibleFindings.some((finding) => finding.id === 'no-agent-instructions')) {
    lines.push('Add an AGENTS.md or another recognized instruction file, then rerun `drctx check --root .`.');
  }
}

function usesCoverageGuidance(finding: Finding): boolean {
  return finding.id === 'no-scannable-context' || finding.id === 'no-agent-instructions';
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
