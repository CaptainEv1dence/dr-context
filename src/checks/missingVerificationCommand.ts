import type { Check, CheckContext, Finding, PackageManagerName, ScriptFact } from '../core/types.js';
import { ciBackedVerificationScriptNames } from './ciDocCommandMismatch.js';
import { parsePackageScriptInvocation } from './packageScriptCommands.js';

const verificationScripts = new Set(['test', 'test:unit', 'test:integration', 'lint', 'typecheck', 'check', 'format:check']);

export const missingVerificationCommandCheck: Check = {
  id: 'missing-verification-command',
  run(context: CheckContext): Finding[] {
    const manager = canonicalPackageManager(context) ?? 'pnpm';
    const managerEvidence = canonicalPackageManagerEvidence(context);
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
      .map((script) =>
        isPlaceholderTestScript(script) ? placeholderTestScriptFinding(script) : verificationFinding(script, manager, managerEvidence, this.id)
      );
  }
};

function verificationFinding(
  script: ScriptFact,
  manager: PackageManagerName,
  managerEvidence: ReturnType<typeof canonicalPackageManagerEvidence>,
  id: string
): Finding {
  const suggestedCommand = suggestedVerificationCommand(script, manager);
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
      },
      ...(managerEvidence
        ? [
            {
              kind: 'package-manager',
              message: `${managerEvidence.source.file} indicates ${managerEvidence.name}.`,
              source: managerEvidence.source
            }
          ]
        : [])
    ],
    suggestion: `Add \`${suggestedCommand}\` to verification instructions.`
  };
}

function placeholderTestScriptFinding(script: ScriptFact): Finding {
  return {
    id: 'placeholder-test-script',
    title: 'package.json contains a placeholder failing test script',
    category: 'verification',
    severity: 'warning',
    confidence: 'high',
    primarySource: script.source,
    evidence: [
      {
        kind: 'package-json-script',
        message: 'package.json defines a placeholder `test` script that exits with failure.',
        source: script.source
      }
    ],
    suggestion: 'Replace the placeholder `test` script with a real verification command or remove it.'
  };
}

function canonicalPackageManager(context: CheckContext): PackageManagerName | undefined {
  return canonicalPackageManagerEvidence(context)?.name;
}

function canonicalPackageManagerEvidence(context: CheckContext) {
  const packageJsonManager = context.facts.packageManagers.find((manager) => manager.source.file === 'package.json');
  if (packageJsonManager?.name && packageJsonManager.name !== 'unknown') {
    return packageJsonManager;
  }

  const lockfileManagers = context.facts.packageManagers.filter((manager) => manager.name !== 'unknown');
  if (lockfileManagers.length === 1) {
    return lockfileManagers[0];
  }

  return lockfileManagers.find((manager) => manager.source.file === 'package-lock.json') ?? lockfileManagers[0];
}

function suggestedVerificationCommand(script: ScriptFact, manager: PackageManagerName): string {
  const directCommand = directVerificationCommand(script.command);
  if (directCommand) {
    return directCommand;
  }

  return script.name === 'test' && manager !== 'pnpm' && manager !== 'bun' ? `${manager} test` : `${manager} run ${script.name}`;
}

function directVerificationCommand(command: string): string | undefined {
  const trimmed = command.trim();
  return /^(forge|cargo|go|pytest|ruff|mypy)\b/.test(trimmed) ? trimmed : undefined;
}

function isPlaceholderTestScript(script: ScriptFact): boolean {
  return script.name === 'test' && /echo\s+["']?Error:\s*no test specified/i.test(script.command) && /exit\s+1/.test(script.command);
}
