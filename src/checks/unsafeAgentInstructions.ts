import type { Check, Finding } from '../core/types.js';

const unsafePatterns = [
  /\bskip tests\b/i,
  /\bignore lint\b/i,
  /--no-verify/i,
  /\bforce push\b/i,
  /git push --force/i
];

const negatedPatterns = [
  /\bdo not skip tests\b/i,
  /\bdon't skip tests\b/i,
  /\bnever skip tests\b/i,
  /\bnever (?:use )?.*--no-verify\b/i,
  /\bdo not .*--no-verify\b/i,
  /\bdon't .*--no-verify\b/i,
  /\bavoid .*--no-verify\b/i,
  /\bdo not .*force push\b/i,
  /\bdon't .*force push\b/i,
  /\bnever .*force push\b/i,
  /\bavoid .*force push\b/i
];

export const unsafeAgentInstructionsCheck: Check = {
  id: 'unsafe-agent-instructions',
  run({ facts }) {
    const findings: Finding[] = [];
    for (const doc of facts.agentInstructionDocs) {
      for (const [index, line] of doc.content.split('\n').entries()) {
        if (!unsafePatterns.some((pattern) => pattern.test(line)) || negatedPatterns.some((pattern) => pattern.test(line))) {
          continue;
        }
        findings.push({
          id: 'unsafe-agent-instructions',
          title: 'Agent instructions include unsafe or anti-verification guidance',
          category: 'agent-instructions',
          severity: 'warning',
          confidence: 'medium',
          primarySource: { file: doc.path, line: index + 1, text: line.trim() },
          evidence: [
            {
              kind: 'unsafe-guidance',
              message: `${doc.path}:${index + 1} includes guidance that may bypass verification or safety checks.`,
              source: { file: doc.path, line: index + 1, text: line.trim() }
            }
          ],
          suggestion: 'Replace bypass guidance with explicit verification and safety expectations.'
        });
      }
    }
    return findings;
  }
};
