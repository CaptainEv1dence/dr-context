import { parsePackageScriptInvocation } from './packageScriptCommands.js';
import type { Check, Finding } from '../core/types.js';

export const agentDocCommandDriftCheck: Check = {
  id: 'agent-doc-command-drift',
  run({ facts }) {
    const byDoc = new Map<string, Map<string, Set<string>>>();
    const agentInstructionPaths = new Set(facts.agentInstructionDocs.map((doc) => doc.path));
    for (const mention of facts.commandMentions) {
      if (!agentInstructionPaths.has(mention.source.file)) {
        continue;
      }
      const invocation = parsePackageScriptInvocation(mention.command);
      if (!invocation) {
        continue;
      }
      const key = invocation.scriptName;
      const byManager = byDoc.get(key) ?? new Map<string, Set<string>>();
      const files = byManager.get(invocation.manager) ?? new Set<string>();
      files.add(mention.source.file);
      byManager.set(invocation.manager, files);
      byDoc.set(key, byManager);
    }

    const findings: Finding[] = [];
    for (const [scriptName, byManager] of byDoc) {
      if (byManager.size < 2 || ![...byManager.values()].every((files) => files.size > 0)) {
        continue;
      }
      if ([...byManager.values()].flatMap((files) => [...files]).length < 2) {
        continue;
      }
      const evidence = facts.commandMentions
        .filter((mention) => agentInstructionPaths.has(mention.source.file))
        .filter((mention) => parsePackageScriptInvocation(mention.command)?.scriptName === scriptName)
        .map((mention) => ({
          kind: 'agent-command',
          message: `${mention.source.file}:${mention.source.line ?? 1} mentions \`${mention.command}\`.`,
          source: mention.source
        }));
      findings.push({
        id: 'agent-doc-command-drift',
        title: `Agent instruction files disagree on verification command "${scriptName}"`,
        category: 'agent-instructions',
        severity: 'warning',
        confidence: 'high',
        primarySource: evidence[0]?.source,
        evidence,
        suggestion: 'Update agent instruction files to use the same package manager and verification command.'
      });
    }

    return findings;
  }
};
