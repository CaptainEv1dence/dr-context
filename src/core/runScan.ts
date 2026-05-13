import { extractAgentInstructionDocs } from '../extractors/agentInstructionDocs.js';
import { extractArchitectureDocs } from '../extractors/architectureDocs.js';
import { extractCiCommands } from '../extractors/ciCommands.js';
import { extractMarkdownCommands } from '../extractors/markdownCommands.js';
import { extractPackageJsonScripts } from '../extractors/packageJsonScripts.js';
import { extractPackageManagers } from '../extractors/packageManagers.js';
import { readWorkspace } from '../io/readWorkspace.js';
import { toolVersion } from '../version.js';
import { runChecks } from './checks.js';
import { summarizeFindings } from './summary.js';
import type { EffectiveConfig, RepoFacts, Report } from './types.js';

export async function runScan(root: string, config: EffectiveConfig): Promise<Report> {
  const files = await readWorkspace(root, { include: config.include, exclude: config.exclude });
  const facts: RepoFacts = {
    root,
    packageManagers: extractPackageManagers(files),
    scripts: extractPackageJsonScripts(files),
    commandMentions: extractMarkdownCommands(files),
    ciCommands: extractCiCommands(files),
    architectureDocs: extractArchitectureDocs(files),
    agentInstructionDocs: extractAgentInstructionDocs(files),
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
