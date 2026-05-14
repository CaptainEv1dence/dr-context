import { extractAgentInstructionDocs } from '../extractors/agentInstructionDocs.js';
import { extractArchitectureDocs } from '../extractors/architectureDocs.js';
import { extractCiCommands } from '../extractors/ciCommands.js';
import { extractLocalPathMentions } from '../extractors/localPathMentions.js';
import { extractMarkdownCommands } from '../extractors/markdownCommands.js';
import { extractPackageJsonScripts } from '../extractors/packageJsonScripts.js';
import { extractPackageManagers } from '../extractors/packageManagers.js';
import { parsePackageScriptInvocation } from '../checks/packageScriptCommands.js';
import { readWorkspace } from '../io/readWorkspace.js';
import { toolVersion } from '../version.js';
import type { EffectiveConfig, LocalPathMention, Manifest, ManifestFirstRead, ManifestInstructionFile, PackageManagerEvidence, RawFile } from './types.js';

export async function buildManifest(root: string, config: EffectiveConfig): Promise<Manifest> {
  const files = await readWorkspace(root, { include: config.include, exclude: config.exclude });
  const packageManagers = extractPackageManagers(files);
  const scripts = extractPackageJsonScripts(files);
  const commandMentions = extractMarkdownCommands(files);
  const ciCommands = extractCiCommands(files);
  const verificationCiCommands = ciCommands.filter((command) => command.classification === 'verification');
  const architectureDocs = extractArchitectureDocs(files);
  const agentInstructionDocs = extractAgentInstructionDocs(files);
  const localPathMentions = extractLocalPathMentions(files);
  const scriptCommands = scripts.map((script) => ({
    command: commandForScript(canonicalPackageManager(packageManagers)?.name ?? 'npm', script.name),
    source: script.source,
    ciBacked: verificationCiCommands.some((mention) => mentionsEquivalentScript(mention.command, script.name)),
    agentVisible: commandMentions.some((mention) => mentionsEquivalentScript(mention.command, script.name))
  }));
  const firstReads = buildFirstReads(files, localPathMentions, architectureDocs.map((doc) => ({
    path: doc.path,
    exists: true,
    agentVisible:
      localPathMentions.some((mention) => mention.path.toLowerCase() === doc.path.toLowerCase()) ||
      agentInstructionDocs.some((agentDoc) => agentDoc.content.toLowerCase().includes(doc.path.toLowerCase())),
    source: doc.source
  })));

  return {
    schemaVersion: 'drctx.manifest.v1',
    tool: 'drctx',
    toolVersion,
    root,
    packageManager: packageManagerManifest(canonicalPackageManager(packageManagers), packageManagers),
    agentInstructionFiles: agentInstructionDocs.map((doc): ManifestInstructionFile => ({
      path: doc.path,
      type: doc.tool,
      scope: doc.scope,
      appliesTo: doc.appliesTo,
      metadata: doc.metadata,
      source: doc.source
    })),
    verificationCommands: scriptCommands,
    firstReads,
    ciCommands,
    summary: {
      agentInstructionFiles: agentInstructionDocs.length,
      verificationCommands: scriptCommands.length,
      firstReads: firstReads.length,
      ciCommands: ciCommands.length
    }
  };
}

function canonicalPackageManager(packageManagers: PackageManagerEvidence[]): PackageManagerEvidence | undefined {
  return packageManagers.find((manager) => manager.raw) ?? packageManagers[0];
}

function packageManagerManifest(
  manager: PackageManagerEvidence | undefined,
  packageManagers: PackageManagerEvidence[]
): Manifest['packageManager'] {
  if (!manager) {
    return undefined;
  }

  return {
    name: manager.name,
    version: manager.version,
    sources: packageManagers.filter((entry) => entry.name === manager.name).map((entry) => entry.source)
  };
}

function commandForScript(manager: string, scriptName: string): string {
  return scriptName === 'test' ? `${manager} test` : `${manager} run ${scriptName}`;
}

function mentionsEquivalentScript(command: string, scriptName: string): boolean {
  const invocation = parsePackageScriptInvocation(command);
  if (invocation?.scriptName === scriptName) {
    return true;
  }

  return command === `npm run ${scriptName}` || command === `pnpm run ${scriptName}` || command === `yarn run ${scriptName}` || command === `bun run ${scriptName}` ||
    (scriptName === 'test' && ['npm test', 'pnpm test', 'yarn test', 'bun test'].includes(command));
}

function buildFirstReads(files: RawFile[], localPathMentions: LocalPathMention[], discoveredDocs: ManifestFirstRead[]): ManifestFirstRead[] {
  const filesByPath = new Map(files.map((file) => [file.path.toLowerCase(), file.path]));
  const byPath = new Map<string, ManifestFirstRead>();

  for (const doc of discoveredDocs) {
    byPath.set(doc.path.toLowerCase(), doc);
  }

  for (const mention of localPathMentions.filter((entry) => isFirstReadReference(entry))) {
    const key = mention.path.toLowerCase();
    if (byPath.has(key)) {
      continue;
    }

    byPath.set(key, {
      path: mention.path,
      exists: filesByPath.has(key),
      agentVisible: true,
      source: mention.source
    });
  }

  return [...byPath.values()];
}

function isFirstReadReference(mention: LocalPathMention): boolean {
  const text = mention.source.text?.toLowerCase() ?? '';
  return /\b(first read|read|start with|before (?:changing|coding|editing|implementation))\b/.test(text);
}
