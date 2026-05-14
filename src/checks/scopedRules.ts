import { minimatch } from 'minimatch';
import type { AgentInstructionDocFact, Check, Finding } from '../core/types.js';

export const scopedRulesCheck: Check = {
  id: 'scoped-rules',
  run({ facts }) {
    return facts.agentInstructionDocs.flatMap((doc) => scopedRuleFindings(doc, facts.filePaths));
  }
};

function scopedRuleFindings(doc: AgentInstructionDocFact, filePaths: string[]): Finding[] {
  if (!isSupportedScopedRuleDoc(doc)) {
    return [];
  }

  return doc.appliesTo.flatMap((pattern) => findingsForPattern(doc, pattern, filePaths));
}

function isSupportedScopedRuleDoc(doc: AgentInstructionDocFact): doc is AgentInstructionDocFact & { appliesTo: string[] } {
  if (doc.tool !== 'cursor' || !doc.appliesTo || doc.appliesTo.length === 0) {
    return false;
  }

  return doc.metadata?.scopedRule === true || doc.appliesTo.length > 0;
}

function findingsForPattern(doc: AgentInstructionDocFact, pattern: string, filePaths: string[]): Finding[] {
  if (isInvalidGlob(pattern)) {
    return [invalidGlobFinding(doc, pattern)];
  }

  const matches = filePaths.filter((filePath) => minimatch(filePath, pattern, { dot: true }));
  if (matches.length === 0) {
    return [noMatchFinding(doc, pattern)];
  }

  if (isTooBroad(matches.length, filePaths.length)) {
    return [tooBroadFinding(doc, pattern, matches.length, filePaths.length)];
  }

  return [];
}

function isInvalidGlob(pattern: string): boolean {
  if (!hasBalancedDelimiters(pattern, '[', ']') || !hasBalancedDelimiters(pattern, '{', '}')) {
    return true;
  }

  try {
    minimatch('', pattern, { dot: true });
    return false;
  } catch {
    return true;
  }
}

function hasBalancedDelimiters(value: string, open: string, close: string): boolean {
  let depth = 0;
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === open) {
      depth += 1;
    }

    if (character === close) {
      depth -= 1;
      if (depth < 0) {
        return false;
      }
    }
  }

  return depth === 0;
}

function isTooBroad(matchCount: number, fileCount: number): boolean {
  return fileCount > 10 && matchCount > Math.max(20, fileCount * 0.8);
}

function invalidGlobFinding(doc: AgentInstructionDocFact, pattern: string): Finding {
  return {
    id: 'invalid-scoped-rule-glob',
    title: `Cursor scoped rule contains invalid glob "${pattern}"`,
    category: 'context-scope',
    severity: 'warning',
    confidence: 'high',
    primarySource: doc.source,
    evidence: [
      {
        kind: 'scoped-rule-glob',
        message: `${doc.path} declares invalid scoped glob ${pattern}.`,
        source: doc.source
      }
    ],
    suggestion: `Fix or remove the invalid scoped glob ${pattern}.`
  };
}

function noMatchFinding(doc: AgentInstructionDocFact, pattern: string): Finding {
  return {
    id: 'scoped-rule-matches-no-files',
    title: `Cursor scoped rule glob "${pattern}" matches no files`,
    category: 'context-scope',
    severity: 'info',
    confidence: 'medium',
    primarySource: doc.source,
    evidence: [
      {
        kind: 'scoped-rule-glob',
        message: `${doc.path} declares scoped glob ${pattern}, but it matches no workspace files.`,
        source: doc.source
      }
    ],
    suggestion: `Update ${pattern} or remove the stale scoped rule.`
  };
}

function tooBroadFinding(doc: AgentInstructionDocFact, pattern: string, matchCount: number, fileCount: number): Finding {
  return {
    id: 'scoped-rule-too-broad',
    title: `Cursor scoped rule glob "${pattern}" matches most files`,
    category: 'context-scope',
    severity: 'info',
    confidence: 'low',
    primarySource: doc.source,
    evidence: [
      {
        kind: 'scoped-rule-glob',
        message: `${doc.path} declares scoped glob ${pattern}, which matches ${matchCount} of ${fileCount} workspace files.`,
        source: doc.source
      }
    ],
    suggestion: `Narrow ${pattern} if this Cursor rule is not intended to apply to most files.`
  };
}
