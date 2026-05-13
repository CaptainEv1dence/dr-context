import type { DiscoverReport, DiscoveryCandidate } from '../discovery/types.js';

export function renderDiscoverText(report: DiscoverReport): string {
  if (report.candidates.length === 0) {
    return 'Dr. Context Discover\n\nNo candidate roots found.\n';
  }

  const lines = ['Dr. Context Discover', '', `Found ${report.candidates.length} candidate root(s).`, ''];

  for (const [index, candidate] of report.candidates.entries()) {
    lines.push(renderCandidate(candidate, index + 1), '');
  }

  return `${lines.join('\n')}\n`;
}

function renderCandidate(candidate: DiscoveryCandidate, index: number): string {
  return [`${index}. ${candidate.path} (${candidate.type})`, 'Signals:', ...candidate.signals.map((signal) => `- ${signal}`)].join('\n');
}
