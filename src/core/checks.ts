import { agentDocCommandDriftCheck } from '../checks/agentDocCommandDrift.js';
import { ciDocCommandMismatchCheck } from '../checks/ciDocCommandMismatch.js';
import { coverageSignalsCheck } from '../checks/coverageSignals.js';
import { hiddenArchitectureDocCheck } from '../checks/hiddenArchitectureDoc.js';
import { missingVerificationCommandCheck } from '../checks/missingVerificationCommand.js';
import { packageManagerMismatchCheck } from '../checks/packageManagerMismatch.js';
import { scopedRulesCheck } from '../checks/scopedRules.js';
import { stalePackageScriptReferenceCheck } from '../checks/stalePackageScriptReference.js';
import { staleFileReferenceCheck } from '../checks/staleFileReference.js';
import { unsafeAgentInstructionsCheck } from '../checks/unsafeAgentInstructions.js';
import { hiddenWorkflowPromptCheck, unsafeWorkflowPromptCheck } from '../checks/workflowPrompts.js';
import type { Check, CheckContext, Finding } from './types.js';

export const checks: Check[] = [
  coverageSignalsCheck,
  packageManagerMismatchCheck,
  agentDocCommandDriftCheck,
  staleFileReferenceCheck,
  unsafeAgentInstructionsCheck,
  unsafeWorkflowPromptCheck,
  hiddenWorkflowPromptCheck,
  scopedRulesCheck,
  stalePackageScriptReferenceCheck,
  ciDocCommandMismatchCheck,
  hiddenArchitectureDocCheck,
  missingVerificationCommandCheck
];

export function runChecks(context: CheckContext): Finding[] {
  const findings = checks.flatMap((check) => check.run(context));
  return findings.some((finding) => finding.id === 'no-agent-instructions')
    ? findings.filter((finding) => finding.id === 'no-agent-instructions' || finding.id === 'hidden-workflow-prompt')
    : findings;
}
