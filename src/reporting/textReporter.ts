import type { Evidence, Finding, Report, SourceSpan } from '../core/types.js';

export function renderText(report: Report): string {
  if (report.findings.length === 0) {
    return 'Dr. Context\n\nNo context rot found.\n';
  }

  const lines = ['Dr. Context', '', `Found ${report.findings.length} finding(s).`, ''];

  for (const [index, finding] of report.findings.entries()) {
    lines.push(renderFinding(finding, index + 1), '');
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

function renderEvidenceItem(evidence: Evidence): string {
  return `- ${evidence.message}`;
}

function formatSource(source?: SourceSpan): string {
  if (!source) {
    return 'unknown source';
  }

  return `${source.file}${source.line ? `:${source.line}` : ''}`;
}
