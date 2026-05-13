import type { Check, CheckContext, Finding, PackageManagerName, ScriptFact } from '../core/types.js';
import { ciBackedVerificationScriptNames } from './ciDocCommandMismatch.js';
import { parsePackageScriptInvocation } from './packageScriptCommands.js';

const verificationScripts = new Set(['test', 'test:unit', 'test:integration', 'lint', 'typecheck', 'check', 'format:check']);

export const missingVerificationCommandCheck: Check = {
  id: 'missing-verification-command',
  run(context: CheckContext): Finding[] {
    const manager = canonicalPackageManager(context) ?? 'pnpm';
    const ciBackedScripts = ciBackedVerificationScriptNames(context);
    const mentionedScripts = new Set(
      context.facts.commandMentions.flatMap((mention) => {
        const invocation = parsePackageScriptInvocation(mention.command);
        return invocation ? [invocation.scriptName] : [];
      })
    );

    return context.facts.scripts
      .filter((script) => verificationScripts.has(script.name))
      .filter((script) => !ciBackedScripts.has(script.name))
      .filter((script) => !mentionedScripts.has(script.name))
      .map((script) => verificationFinding(script, manager, this.id));
  }
};

function verificationFinding(script: ScriptFact, manager: PackageManagerName, id: string): Finding {
  return {
    id,
    title: `Verification script "${script.name}" is not mentioned in agent instructions`,
    category: 'verification',
    severity: 'warning',
    confidence: 'high',
    primarySource: script.source,
    evidence: [
      {
        kind: 'package-json-script',
        message: `package.json defines verification script "${script.name}".`,
        source: script.source
      },
      {
        kind: 'agent-visible-command',
        message: `No agent-visible instruction mentions \`${manager} run ${script.name}\` or \`${manager} ${script.name}\`.`
      }
    ],
    suggestion: `Add \`${manager} run ${script.name}\` to verification instructions.`
  };
}

function canonicalPackageManager(context: CheckContext): PackageManagerName | undefined {
  const packageJsonManager = context.facts.packageManagers.find((manager) => manager.source.file === 'package.json')?.name;
  return packageJsonManager && packageJsonManager !== 'unknown' ? packageJsonManager : undefined;
}
