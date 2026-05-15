import { calculateHealthSummary } from './health.js';
import type { Finding, Report } from './types.js';

export function summarizeFindings(findings: Finding[]): Report['summary'] {
  const counts = {
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    infos: findings.filter((finding) => finding.severity === 'info').length
  };

  return {
    ...counts,
    health: calculateHealthSummary(counts)
  };
}
