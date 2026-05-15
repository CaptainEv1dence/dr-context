import type { Report } from '../core/types.js';

export type JsonReportOptions = {
  showSuppressed?: boolean;
};

export function renderJson(report: Report, options: JsonReportOptions = {}): string {
  if (options.showSuppressed) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const visibleReport = { ...report };
  delete visibleReport.suppressedFindings;
  return `${JSON.stringify(visibleReport, null, 2)}\n`;
}
