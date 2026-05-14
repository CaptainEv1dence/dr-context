import type { Check, Finding } from '../core/types.js';

export const staleFileReferenceCheck: Check = {
  id: 'stale-file-reference',
  run({ facts }) {
    return facts.localPathMentions
      .filter((mention) => facts.agentInstructionDocs.some((doc) => doc.path === mention.source.file))
      .filter((mention) => !mention.exists)
      .filter((mention) => !isPlaceholderPath(mention.path))
      .map((mention): Finding => ({
        id: 'stale-file-reference',
        title: `Agent instructions reference missing file "${mention.path}"`,
        category: 'agent-instructions',
        severity: 'warning',
        confidence: 'high',
        primarySource: mention.source,
        evidence: [
          {
            kind: 'missing-local-file',
            message: `${mention.source.file}:${mention.source.line ?? 1} references ${mention.path}, but that file was not found.`,
            source: mention.source
          }
        ],
        suggestion: `Update or remove the reference to ${mention.path}.`
      }));
  }
};

function isPlaceholderPath(path: string): boolean {
  return path.includes('/path/to/') || path.startsWith('path/to/');
}
