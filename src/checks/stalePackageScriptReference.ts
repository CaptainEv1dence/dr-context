import type { Check, CheckContext, Finding, PackageManagerName, ScriptFact, SourceSpan } from '../core/types.js';
import { parsePackageScriptInvocation, type PackageScriptInvocation } from './packageScriptCommands.js';

export const stalePackageScriptReferenceCheck: Check = {
  id: 'stale-package-script-reference',
  run(context: CheckContext): Finding[] {
    const scriptsByName = new Map(context.facts.scripts.map((script) => [script.name, script]));
    const availableScriptNames = sortedScriptNames(context.facts.scripts);

    return context.facts.commandMentions.flatMap((mention) => {
      const invocation = parsePackageScriptInvocation(mention.command);
      if (!invocation || scriptsByName.has(invocation.scriptName)) {
        return [];
      }

      return [
        {
          id: this.id,
          title: `Docs reference missing package script "${invocation.scriptName}"`,
          category: 'package-script',
          severity: 'error',
          confidence: 'high',
          primarySource: mention.source,
          evidence: [
            {
              kind: 'command-mention',
              message: `${mention.source.file}:${mention.source.line} mentions \`${mention.command}\`.`,
              source: mention.source
            },
            {
              kind: 'package-json-scripts',
              message: `package.json scripts: ${availableScriptNames.join(', ') || '(none)'}.`,
              source: packageJsonScriptsSource(context.facts.scripts)
            }
          ],
          suggestion: suggestionForMissingScript(invocation, availableScriptNames, canonicalPackageManager(context))
        }
      ];
    });
  }
};

function sortedScriptNames(scripts: ScriptFact[]): string[] {
  return scripts.map((script) => script.name).sort((left, right) => left.localeCompare(right));
}

function packageJsonScriptsSource(scripts: ScriptFact[]): SourceSpan | undefined {
  const firstScript = scripts[0];
  return firstScript ? { file: firstScript.source.file } : { file: 'package.json' };
}

function canonicalPackageManager(context: CheckContext): PackageManagerName | undefined {
  return context.facts.packageManagers.find((manager) => manager.source.file === 'package.json')?.name;
}

function suggestionForMissingScript(
  invocation: PackageScriptInvocation,
  availableScripts: string[],
  canonicalManager: PackageManagerName | undefined
): string {
  const manager = canonicalManager && canonicalManager !== 'unknown' ? canonicalManager : invocation.manager;

  if (availableScripts.includes('test') && invocation.scriptName.startsWith('test')) {
    return `Use \`${manager} test\` or add a "${invocation.scriptName}" script to package.json.`;
  }

  if (availableScripts.length === 0) {
    return `Add a "${invocation.scriptName}" script to package.json or remove the stale command reference.`;
  }

  return `Add a "${invocation.scriptName}" script to package.json or update the docs to one of: ${availableScripts.join(', ')}.`;
}
