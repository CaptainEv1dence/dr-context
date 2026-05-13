import { ciDocCommandMismatchCheck } from '../checks/ciDocCommandMismatch.js';
import { hiddenArchitectureDocCheck } from '../checks/hiddenArchitectureDoc.js';
import { missingVerificationCommandCheck } from '../checks/missingVerificationCommand.js';
import { packageManagerMismatchCheck } from '../checks/packageManagerMismatch.js';
import { stalePackageScriptReferenceCheck } from '../checks/stalePackageScriptReference.js';
import type { Check, CheckContext, Finding } from './types.js';

export const checks: Check[] = [
  packageManagerMismatchCheck,
  stalePackageScriptReferenceCheck,
  ciDocCommandMismatchCheck,
  hiddenArchitectureDocCheck,
  missingVerificationCommandCheck
];

export function runChecks(context: CheckContext): Finding[] {
  return checks.flatMap((check) => check.run(context));
}
