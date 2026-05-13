import type { Check, CheckContext, CommandMention, Finding, PackageManagerName, ScriptFact } from '../core/types.js';
import { parsePackageScriptInvocation } from './packageScriptCommands.js';

const ciVerificationScripts = new Set(['test', 'test:unit', 'test:integration', 'lint', 'typecheck', 'check', 'format:check', 'build']);

export const ciDocCommandMismatchCheck: Check = {
  id: 'ci-doc-command-mismatch',
  run(context: CheckContext): Finding[] {
    const scriptsByName = new Map(context.facts.scripts.map((script) => [script.name, script]));
    const agentInstructionPaths = new Set(context.facts.agentInstructionDocs.map((doc) => doc.path));
    const mentionedScripts = new Set(
      context.facts.commandMentions
        .filter((mention) => agentInstructionPaths.has(mention.source.file))
        .flatMap((mention) => scriptMentionedBy(mention))
    );
    const manager = canonicalPackageManager(context) ?? 'pnpm';
    const seenScripts = new Set<string>();

    return context.facts.ciCommands.flatMap((command) => {
      const invocation = parsePackageScriptInvocation(command.command);
      if (!invocation || !ciVerificationScripts.has(invocation.scriptName) || mentionedScripts.has(invocation.scriptName)) {
        return [];
      }

      const script = scriptsByName.get(invocation.scriptName);
      if (!script || seenScripts.has(invocation.scriptName)) {
        return [];
      }

      seenScripts.add(invocation.scriptName);
      return [ciDocCommandMismatchFinding(this.id, command, script, manager)];
    });
  }
};

function ciDocCommandMismatchFinding(id: string, command: CommandMention, script: ScriptFact, manager: PackageManagerName): Finding {
  return {
    id,
    title: `CI runs "${script.name}" but agent instructions do not mention it`,
    category: 'verification',
    severity: 'warning',
    confidence: 'high',
    primarySource: command.source,
    evidence: [
      {
        kind: 'ci-command',
        message: `${command.source.file}:${command.source.line} runs \`${command.command}\`.`,
        source: command.source
      },
      {
        kind: 'agent-visible-command',
        message: `No agent-visible instruction mentions \`${manager} run ${script.name}\` or \`${manager} ${script.name}\`.`
      },
      {
        kind: 'package-json-script',
        message: `package.json defines script "${script.name}".`,
        source: script.source
      }
    ],
    suggestion: `Add \`${manager} run ${script.name}\` to agent verification instructions so local agent checks match CI.`
  };
}

function scriptMentionedBy(mention: CommandMention): string[] {
  const invocation = parsePackageScriptInvocation(mention.command);
  return invocation ? [invocation.scriptName] : [];
}

function canonicalPackageManager(context: CheckContext): PackageManagerName | undefined {
  const packageJsonManager = context.facts.packageManagers.find((manager) => manager.source.file === 'package.json')?.name;
  return packageJsonManager && packageJsonManager !== 'unknown' ? packageJsonManager : undefined;
}

export function ciBackedVerificationScriptNames(context: CheckContext): Set<string> {
  const scriptNames = new Set(context.facts.scripts.map((script) => script.name));
  return new Set(
    context.facts.ciCommands.flatMap((command) => {
      const invocation = parsePackageScriptInvocation(command.command);
      if (!invocation || !scriptNames.has(invocation.scriptName) || !ciVerificationScripts.has(invocation.scriptName)) {
        return [];
      }

      return [invocation.scriptName];
    })
  );
}
