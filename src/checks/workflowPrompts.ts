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

function hasUnsafeWorkflowPrompt(value: string): boolean {
  return unsafePatterns.some((pattern) => pattern.test(value)) && !negatedPatterns.some((pattern) => pattern.test(value));
}

export const unsafeWorkflowPromptCheck: Check = {
  id: 'unsafe-workflow-prompt',
  run({ facts }) {
    return facts.workflowPrompts.flatMap((prompt): Finding[] => {
      if (!hasUnsafeWorkflowPrompt(prompt.value)) {
        return [];
      }

      return [
        {
          id: 'unsafe-workflow-prompt',
          title: 'Workflow-embedded agent prompt includes unsafe guidance',
          category: 'agent-instructions',
          severity: 'warning',
          confidence: 'medium',
          primarySource: prompt.source,
          evidence: [
            {
              kind: 'workflow-prompt',
              message: `${prompt.source.file}:${prompt.source.line ?? 1} embeds ${prompt.kind} for ${prompt.action}.`,
              source: prompt.source
            }
          ],
          suggestion:
            'Move safe agent guidance into repo-visible instructions and replace bypass guidance with explicit verification expectations.'
        }
      ];
    });
  }
};

export const hiddenWorkflowPromptCheck: Check = {
  id: 'hidden-workflow-prompt',
  run({ facts }) {
    if (facts.workflowPrompts.length === 0 || facts.agentInstructionDocs.length > 0) {
      return [];
    }

    const prompt = facts.workflowPrompts[0];
    return [
      {
        id: 'hidden-workflow-prompt',
        title: 'Agent prompt exists only inside a workflow',
        category: 'agent-instructions',
        severity: 'info',
        confidence: 'high',
        primarySource: prompt.source,
        evidence: [
          {
            kind: 'workflow-prompt',
            message: `${prompt.source.file}:${prompt.source.line ?? 1} embeds ${prompt.kind}, but no repo-visible agent instruction file was found.`,
            source: prompt.source
          }
        ],
        suggestion: 'Add or reference canonical agent instructions in AGENTS.md or CLAUDE.md so local agents and humans see the same guidance.'
      }
    ];
  }
};
