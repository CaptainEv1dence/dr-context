import type { Check, Finding } from '../core/types.js';

export const parentPolicyVisibilityCheck: Check = {
  id: 'parent-policy-not-inherited',
  run({ facts }) {
    const parentDoc = facts.parentAgentInstructionDocs?.find((doc) => hasParentPolicy(doc.content));
    if (!parentDoc) {
      return [];
    }

    return [
      {
        id: 'parent-policy-not-inherited',
        title: 'Workspace parent instructions are visible but not inherited',
        category: 'workspace-policy-visibility',
        severity: 'info',
        confidence: 'high',
        primarySource: parentDoc.source,
        evidence: [
          {
            kind: 'parent-agent-instructions',
            message: `${parentDoc.displayPath ?? parentDoc.path} exists at the workspace parent, but parent instruction inheritance is disabled for this child scan.`,
            source: parentDoc.source
          }
        ],
        suggestion: 'Enable parent instruction inheritance for workspace scans or copy/link the parent policy into child agent-visible instructions.'
      } satisfies Finding
    ];
  }
};

function hasParentPolicy(content: string): boolean {
  return /\b(?:do not|don't|never|must not|without approval|explicit approval|requires approval|ask before|confirm before)\b[^.\n]*(?:live|traffic|authenticated|state-changing|production|secrets?|tokens?|credentials?|destructive|force push|reset --hard|rm -rf|drop table)|\b(?:tdd|self-scan|baseline|suppressions?)\b[^.\n]*(?:required|must|policy)/i.test(content);
}
