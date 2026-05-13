import type { DiscoverReport } from '../discovery/types.js';

export function renderDiscoverJson(report: DiscoverReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
