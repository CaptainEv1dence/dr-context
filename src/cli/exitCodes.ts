import type { Report, WorkspaceReport } from '../core/types.js';

export function exitCodeForReport(report: Report, strict: boolean): number {
  if (report.summary.errors > 0) {
    return 1;
  }

  if (strict && report.summary.warnings > 0) {
    return 1;
  }

  return 0;
}

export function exitCodeForWorkspaceReport(report: WorkspaceReport, strict: boolean): number {
  if (report.summary.errors > 0) {
    return 1;
  }

  if (strict && report.summary.warnings > 0) {
    return 1;
  }

  if (report.reports.some((entry) => entry.strict && entry.report.summary.warnings > 0)) {
    return 1;
  }

  return 0;
}
