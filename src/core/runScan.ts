import { extractAgentInstructionDocs } from '../extractors/agentInstructionDocs.js';
import { extractArchitectureDocs } from '../extractors/architectureDocs.js';
import { extractCiCommands } from '../extractors/ciCommands.js';
import { extractLocalPathMentions } from '../extractors/localPathMentions.js';
import { extractMarkdownCommands } from '../extractors/markdownCommands.js';
import { extractPackageJsonScripts } from '../extractors/packageJsonScripts.js';
import { extractPackageManagers } from '../extractors/packageManagers.js';
import { readWorkspace } from '../io/readWorkspace.js';
import { toolVersion } from '../version.js';
import { runChecks } from './checks.js';
import { summarizeFindings } from './summary.js';
import type { EffectiveConfig, RepoFacts, Report } from './types.js';
import { access } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export async function runScan(root: string, config: EffectiveConfig): Promise<Report> {
  const files = await readWorkspace(root, { include: config.include, exclude: config.exclude });
  const localPathMentions = await markExistingLocalPaths(root, extractLocalPathMentions(files));
  const facts: RepoFacts = {
    root,
    packageManagers: extractPackageManagers(files),
    scripts: extractPackageJsonScripts(files),
    commandMentions: extractMarkdownCommands(files),
    ciCommands: extractCiCommands(files),
    architectureDocs: extractArchitectureDocs(files),
    agentInstructionDocs: extractAgentInstructionDocs(files),
    localPathMentions,
    files,
    keyDirectories: []
  };
  const findings = runChecks({ facts, config });

  return {
    schemaVersion: 'drctx.report.v1',
    tool: 'drctx',
    toolVersion,
    root,
    findings,
    summary: summarizeFindings(findings)
  };
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
