import type { Check, CheckContext, Finding } from '../core/types.js';

export const coverageSignalsCheck: Check = {
  id: 'coverage-signals',
  run(context: CheckContext): Finding[] {
    const hasAnyFacts =
      context.facts.packageManagers.length > 0 ||
      context.facts.scripts.length > 0 ||
      context.facts.ciCommands.length > 0 ||
      context.facts.architectureDocs.length > 0 ||
      context.facts.commandMentions.length > 0 ||
      context.facts.agentInstructionDocs.length > 0 ||
      context.facts.workflowPrompts.length > 0;

    if (!hasAnyFacts) {
      return [noScannableContextFinding()];
    }

    if (context.facts.agentInstructionDocs.length === 0) {
      return [noAgentInstructionsFinding()];
    }

    return [];
  }
};

function noScannableContextFinding(): Finding {
  return {
    id: 'no-scannable-context',
    title: 'No supported context or repo fact files were found',
    category: 'coverage',
    severity: 'info',
    confidence: 'high',
    evidence: [
      {
        kind: 'workspace-discovery',
        message: 'Dr. Context did not find supported agent instructions, package files, CI workflows, or architecture docs.'
      }
    ],
    suggestion: 'Run Dr. Context at a repository root or add supported context files such as AGENTS.md, package.json, or CI workflows.'
  };
}

function noAgentInstructionsFinding(): Finding {
  return {
    id: 'no-agent-instructions',
    title: 'No agent-visible instruction file was found',
    category: 'coverage',
    severity: 'info',
    confidence: 'high',
    evidence: [
      {
        kind: 'agent-instructions',
        message: 'Repo facts exist, but no supported agent instruction file was discovered.'
      }
    ],
    suggestion: 'Add an AGENTS.md or another supported agent instruction file with exact verification commands and first-read docs.'
  };
}
