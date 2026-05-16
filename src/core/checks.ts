import { agentDocCommandDriftCheck } from '../checks/agentDocCommandDrift.js';
import { ciDocCommandMismatchCheck } from '../checks/ciDocCommandMismatch.js';
import { contextHistoryCheck } from '../checks/contextHistory.js';
import { coverageSignalsCheck } from '../checks/coverageSignals.js';
import { hiddenArchitectureDocCheck } from '../checks/hiddenArchitectureDoc.js';
import { missingVerificationCommandCheck } from '../checks/missingVerificationCommand.js';
import { packageManagerMismatchCheck } from '../checks/packageManagerMismatch.js';
import { parentPolicyVisibilityCheck } from '../checks/parentPolicyVisibility.js';
import { readmeCompletenessCheck } from '../checks/readmeCompleteness.js';
import { liveOperationPolicyCheck } from '../checks/liveOperationPolicy.js';
import { hiddenPolicyVisibilityChecks, missingGeneratedFileBoundaryCheck } from '../checks/policyVisibility.js';
import { duplicateInstructionBlockCheck, oversizedInstructionFileCheck } from '../checks/ruleQuality.js';
import { runtimeDriftCheck } from '../checks/runtimeDrift.js';
import { scopedRulesCheck } from '../checks/scopedRules.js';
import { stalePackageScriptReferenceCheck } from '../checks/stalePackageScriptReference.js';
import { staleFileReferenceCheck } from '../checks/staleFileReference.js';
import { unsafeAgentInstructionsCheck } from '../checks/unsafeAgentInstructions.js';
import { verificationCommandConflictCheck } from '../checks/verificationCommandConflict.js';
import { hiddenWorkflowPromptCheck, unsafeWorkflowPromptCheck } from '../checks/workflowPrompts.js';
import type { Check, CheckContext, Finding } from './types.js';

export const checks: Check[] = [
  coverageSignalsCheck,
  contextHistoryCheck,
  runtimeDriftCheck,
  packageManagerMismatchCheck,
  verificationCommandConflictCheck,
  agentDocCommandDriftCheck,
  readmeCompletenessCheck,
  staleFileReferenceCheck,
  unsafeAgentInstructionsCheck,
  unsafeWorkflowPromptCheck,
  hiddenWorkflowPromptCheck,
  parentPolicyVisibilityCheck,
  ...hiddenPolicyVisibilityChecks,
  liveOperationPolicyCheck,
  missingGeneratedFileBoundaryCheck,
  oversizedInstructionFileCheck,
  duplicateInstructionBlockCheck,
  scopedRulesCheck,
  stalePackageScriptReferenceCheck,
  ciDocCommandMismatchCheck,
  hiddenArchitectureDocCheck,
  missingVerificationCommandCheck
];

export function runChecks(context: CheckContext): Finding[] {
  const findings = checks.flatMap((check) => check.run(context));
  return findings.some((finding) => finding.id === 'no-agent-instructions')
    ? findings.filter(
        (finding) =>
          finding.id === 'no-agent-instructions' ||
          finding.id === 'hidden-workflow-prompt' ||
          finding.id === 'oversized-instruction-file' ||
          finding.id === 'duplicate-instruction-block' ||
          finding.id === 'unsafe-workflow-prompt'
      )
    : findings;
}
