import { extractAgentInstructionDocs } from '../extractors/agentInstructionDocs.js';
import { extractArchitectureDocs } from '../extractors/architectureDocs.js';
import { extractBuildTargets } from '../extractors/buildTargets.js';
import { extractCiCommands } from '../extractors/ciCommands.js';
import { extractLocalPathMentions } from '../extractors/localPathMentions.js';
import { extractMarkdownCommands } from '../extractors/markdownCommands.js';
import { extractPackageJsonScripts } from '../extractors/packageJsonScripts.js';
import { extractPackageManagers } from '../extractors/packageManagers.js';
import { extractRuntimeVersions } from '../extractors/runtimeVersions.js';
import { extractWorkflowPrompts } from '../extractors/workflowPrompts.js';
import { listWorkspaceFilePaths } from '../io/listWorkspaceFilePaths.js';
import { readWorkspace } from '../io/readWorkspace.js';
import { toolVersion } from '../version.js';
import { runChecks } from './checks.js';
import { summarizeFindings } from './summary.js';
import type { EffectiveConfig, RepoFacts, Report } from './types.js';
import { access } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export async function runScan(root: string, config: EffectiveConfig): Promise<Report> {
  const workspace = await readWorkspace(root, { include: config.include, exclude: config.exclude, limits: config.resourceLimits, returnResource: true });
  const files = workspace.files.filter((file) => !isContextHistoryFile(file.path));
  const contextHistoryFiles = workspace.files.filter((file) => isContextHistoryFile(file.path));
  const filePathInventory = await listWorkspaceFilePaths(root, { maxFiles: config.resourceLimits?.maxFiles ?? 500 });
  const filePaths = filePathInventory.paths;
  const localPathMentions = await markExistingLocalPaths(root, extractLocalPathMentions(files));
  const facts: RepoFacts = {
    root,
    packageManagers: extractPackageManagers(files),
    scripts: extractPackageJsonScripts(files),
    buildTargets: extractBuildTargets(files),
    runtimeVersions: extractRuntimeVersions(files),
    commandMentions: extractMarkdownCommands(files),
    ciCommands: extractCiCommands(files),
    workflowPrompts: extractWorkflowPrompts(files),
    architectureDocs: extractArchitectureDocs(files),
    agentInstructionDocs: extractAgentInstructionDocs(files),
    inheritedAgentInstructionDocs: config.inheritedAgentInstructionDocs ?? [],
    parentAgentInstructionDocs: config.parentAgentInstructionDocs,
    localPathMentions,
    files,
    contextHistoryFiles,
    filePaths,
    keyDirectories: [],
    scanResource: workspace.resource
  };
  const findings = runChecks({ facts, config });

  return {
    schemaVersion: 'drctx.report.v1',
    tool: 'drctx',
    toolVersion,
    root,
    inheritedInstructionFiles: inheritedInstructionFiles(facts),
    findings,
    summary: summarizeFindings(findings),
    scanResource: workspace.resource.hitLimit ? workspace.resource : undefined
  };
}

function isContextHistoryFile(path: string): boolean {
  return /^docs\/superpowers\/(?:plans|specs|reports)\/[^/]+\.mdx?$/i.test(path);
}

function inheritedInstructionFiles(facts: RepoFacts): Report['inheritedInstructionFiles'] {
  if (facts.inheritedAgentInstructionDocs.length === 0) {
    return undefined;
  }

  return facts.inheritedAgentInstructionDocs.map((doc) => ({
    path: doc.path,
    type: doc.tool,
    scope: doc.scope,
    appliesTo: doc.appliesTo,
    metadata: doc.metadata,
    source: doc.source,
    inherited: true,
    inheritedFrom: doc.inheritedFrom ?? 'workspace-parent',
    displayPath: doc.displayPath ?? `<workspace-parent>/${doc.path}`,
    appliesBecause: 'inherited from workspace parent because --inherit-parent-instructions is enabled'
  }));
}

async function markExistingLocalPaths(root: string, mentions: RepoFacts['localPathMentions']): Promise<RepoFacts['localPathMentions']> {
  const resolvedRoot = resolve(root);
  return Promise.all(
    mentions.map(async (mention) => ({
      ...mention,
      exists: await existsWithinRoot(resolvedRoot, mention.path)
    }))
  );
}

async function existsWithinRoot(root: string, mentionedPath: string): Promise<boolean> {
  if (isAbsolute(mentionedPath)) {
    return false;
  }

  const resolvedPath = resolve(root, mentionedPath);
  const relativePath = relative(root, resolvedPath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return false;
  }

  return exists(resolvedPath);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
