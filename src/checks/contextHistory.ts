import type { Check, Finding, RawFile } from '../core/types.js';

const historyPathPattern = /^docs\/superpowers\/(?:plans|specs|reports)\/[^/]*\d{4}-\d{2}-\d{2}[^/]*\.mdx?$/i;
const indexPathPattern = /^docs\/superpowers\/(?:README|index|current)\.md$/i;
const statusMarkerPattern = /\b(?:active|current|done|shipped|superseded|superseded_by)\b/i;

export const contextHistoryCheck: Check = {
  id: 'unindexed-context-history',
  run(context): Finding[] {
    const datedHistoryFiles = (context.facts.contextHistoryFiles ?? []).filter((file) => historyPathPattern.test(file.path));
    if (datedHistoryFiles.length < 8 || hasStatusIndex(context.facts.files)) {
      return [];
    }

    return [
      {
        id: this.id,
        title: 'Dated context history lacks a current index',
        category: 'context-history',
        severity: 'info',
        confidence: 'medium',
        primarySource: sourceForFile(datedHistoryFiles[0]),
        evidence: [
          {
            kind: 'dated-context-history',
            message: `Found ${datedHistoryFiles.length} dated docs/superpowers history files without a current index.`,
            source: sourceForFile(datedHistoryFiles[0])
          }
        ],
        suggestion: 'Add docs/superpowers/README.md or docs/superpowers/current.md with active/current/done/shipped/superseded markers.'
      }
    ];
  }
};

function hasStatusIndex(files: RawFile[]): boolean {
  return files.some((file) => indexPathPattern.test(file.path) && statusMarkerPattern.test(file.content));
}

function sourceForFile(file: RawFile) {
  return {
    file: file.path,
    line: 1,
    text: file.content.split('\n')[0]?.trim() ?? ''
  };
}
