import type { HealthGrade, HealthSummary, Report } from './types.js';

type FindingCounts = {
  errors: number;
  warnings: number;
  infos: number;
  suppressed?: number;
};

const ERROR_PENALTY = 35;
const WARNING_PENALTY = 10;
const INFO_PENALTY = 2;

export function calculateHealthSummary(counts: FindingCounts): HealthSummary {
  const penalties = {
    errors: counts.errors * ERROR_PENALTY,
    warnings: counts.warnings * WARNING_PENALTY,
    infos: counts.infos * INFO_PENALTY
  };
  const score = clampScore(100 - penalties.errors - penalties.warnings - penalties.infos);

  return {
    score,
    grade: gradeForScore(score),
    penalties,
    suppressedCount: counts.suppressed ?? 0
  };
}

export function healthSummaryFromReports(reports: Report[]): HealthSummary {
  return calculateHealthSummary({
    errors: reports.reduce((total, report) => total + report.summary.errors, 0),
    warnings: reports.reduce((total, report) => total + report.summary.warnings, 0),
    infos: reports.reduce((total, report) => total + report.summary.infos, 0),
    suppressed: reports.reduce((total, report) => total + (report.summary.suppressed ?? 0), 0)
  });
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function gradeForScore(score: number): HealthGrade {
  if (score >= 95) {
    return 'excellent';
  }
  if (score >= 80) {
    return 'good';
  }
  if (score >= 60) {
    return 'fair';
  }
  return 'poor';
}
