import type {
  Check,
  CheckContext,
  CiCommandMention,
  CommandMention,
  Finding,
  PackageManagerEvidence,
  PackageManagerName,
  ScriptFact
} from '../core/types.js';
import { parsePackageScriptInvocation, type PackageScriptInvocation } from './packageScriptCommands.js';

const verificationScriptIntents = new Set(['test', 'test:unit', 'test:integration', 'lint', 'typecheck', 'check', 'format:check']);

export const verificationCommandConflictCheck: Check = {
  id: 'verification-command-conflict',
  run(context: CheckContext): Finding[] {
    const canonicalManager = canonicalPackageManagerEvidence(context);
    if (!canonicalManager || canonicalManager.name === 'unknown') {
      return [];
    }

    const scriptsByName = new Map(context.facts.scripts.map((script) => [script.name, script]));
    const agentInstructionPaths = new Set(context.facts.agentInstructionDocs.map((doc) => doc.path));
    const ciVerificationCommands = context.facts.ciCommands
      .map((command) => ({ command, invocation: verificationInvocation(command.command, scriptsByName) }))
      .filter((entry): entry is { command: CiCommandMention; invocation: PackageScriptInvocation } => Boolean(entry.invocation));
    const seen = new Set<string>();

    return context.facts.commandMentions.flatMap((mention) => {
      if (!agentInstructionPaths.has(mention.source.file)) {
        return [];
      }

      const agentInvocation = verificationInvocation(mention.command, scriptsByName);
      if (!agentInvocation || agentInvocation.manager === canonicalManager.name) {
        return [];
      }

      const ciMatch = ciVerificationCommands.find((entry) => entry.invocation.scriptName === agentInvocation.scriptName);
      const script = scriptsByName.get(agentInvocation.scriptName);
      if (!ciMatch || !script || seen.has(agentInvocation.scriptName)) {
        return [];
      }

      seen.add(agentInvocation.scriptName);
      return [verificationCommandConflictFinding(this.id, mention, agentInvocation, ciMatch.command, script, canonicalManager)];
    });
  }
};

function verificationInvocation(command: string, scriptsByName: Map<string, ScriptFact>): PackageScriptInvocation | undefined {
  const invocation = parsePackageScriptInvocation(command);
  if (!invocation || !verificationScriptIntents.has(invocation.scriptName) || !scriptsByName.has(invocation.scriptName)) {
    return undefined;
  }

  return invocation;
}

function verificationCommandConflictFinding(
  id: string,
  mention: CommandMention,
  agentInvocation: PackageScriptInvocation,
  ciCommand: CiCommandMention,
  script: ScriptFact,
  canonicalManager: PackageManagerEvidence
): Finding {
  const expectedCommand = expectedVerificationCommand(agentInvocation.scriptName, canonicalManager.name);
  return {
    id,
    title: `Agent instructions run ${agentInvocation.manager} for "${agentInvocation.scriptName}", but CI uses ${canonicalManager.name}`,
    category: 'verification',
    severity: 'error',
    confidence: canonicalManager.confidence,
    primarySource: mention.source,
    evidence: [
      {
        kind: 'agent-visible-command',
        message: `${mention.source.file}:${mention.source.line} tells agents to run \`${mention.command}\`.`,
        source: mention.source
      },
      {
        kind: 'ci-command',
        message: `${ciCommand.source.file}:${ciCommand.source.line} runs \`${ciCommand.command}\`.`,
        source: ciCommand.source
      },
      {
        kind: 'package-json-script',
        message: `package.json defines script "${script.name}".`,
        source: script.source
      },
      {
        kind: 'package-manager',
        message: `${canonicalManager.source.file} declares packageManager: ${canonicalManager.raw ?? canonicalManager.name}.`,
        source: canonicalManager.source
      }
    ],
    suggestion: `Replace \`${mention.command}\` with \`${expectedCommand}\` so agent verification matches CI and package.json.`
  };
}

function expectedVerificationCommand(scriptName: string, manager: PackageManagerName): string {
  return scriptName === 'test' ? `${manager} test` : `${manager} run ${scriptName}`;
}

function canonicalPackageManagerEvidence(context: CheckContext): PackageManagerEvidence | undefined {
  return context.facts.packageManagers.find((manager) => manager.source.file === 'package.json');
}
