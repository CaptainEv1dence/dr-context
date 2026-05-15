import { createHash } from 'node:crypto';
import { calculateHealthSummary } from './health.js';
import { summarizeFindings } from './summary.js';
import type { Finding, FindingSuppression, Report, SuppressedFinding, SuppressionResult } from './types.js';

export function fingerprintFinding(finding: Finding): string {
  const input = [
    finding.id,
    finding.primarySource?.file ?? '',
    finding.primarySource?.line?.toString() ?? '',
    finding.title
  ].join('\n');

  return `sha256:${createHash('sha256').update(input).digest('hex')}`;
}

export function applySuppressions(findings: Finding[], suppressions: FindingSuppression[]): SuppressionResult {
  const activeFindings: Finding[] = [];
  const suppressedFindings: SuppressedFinding[] = [];

  for (const finding of findings) {
    const fingerprint = fingerprintFinding(finding);
    const suppression = suppressions.find((candidate) => matchesSuppression(finding, fingerprint, candidate));

    if (suppression) {
      suppressedFindings.push({ ...finding, fingerprint, suppression });
    } else {
      activeFindings.push(finding);
    }
  }

  return { findings: activeFindings, suppressedFindings };
}

export function withSuppressionResult(report: Report, result: SuppressionResult): Report {
  return {
    ...report,
    findings: result.findings,
    suppressedFindings: result.suppressedFindings,
    summary: summarizeWithSuppressed(result)
  };
}

function summarizeWithSuppressed(result: SuppressionResult): Report['summary'] {
  const visibleSummary = summarizeFindings(result.findings);
  const counts = {
    errors: visibleSummary.errors,
    warnings: visibleSummary.warnings,
    infos: visibleSummary.infos,
    suppressed: result.suppressedFindings.length
  };

  return {
    ...counts,
    health: calculateHealthSummary(counts)
  };
}

function matchesSuppression(finding: Finding, fingerprint: string, suppression: FindingSuppression): boolean {
  if (suppression.id !== finding.id) {
    return false;
  }

  if (suppression.fingerprint) {
    return suppression.fingerprint === fingerprint;
  }

  if (suppression.file && suppression.file === finding.primarySource?.file) {
    return true;
  }

  return false;
}
