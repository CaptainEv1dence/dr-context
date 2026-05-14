import { minimatch } from 'minimatch';
import type { AgentInstructionDocFact, EffectiveContext, EffectiveInstructionFile, RepoFacts } from './types.js';

export type EffectiveContextOptions = {
  targetPath?: string;
  includeInherited?: boolean;
  parentInstructionFiles?: AgentInstructionDocFact[];
};

export function resolveEffectiveContext(facts: RepoFacts, options: EffectiveContextOptions = {}): EffectiveContext {
  const targetPath = normalizePath(options.targetPath ?? '');
  const inheritedDocs = options.includeInherited ? options.parentInstructionFiles ?? facts.inheritedAgentInstructionDocs : [];
  const inheritedEntries = inheritedDocs.map((doc) =>
    toEffectiveInstructionFile(doc, true, 'inherited from workspace parent because --inherit-parent-instructions is enabled')
  );
  const localEntries = facts.agentInstructionDocs
    .filter((doc) => appliesToTarget(doc, targetPath))
    .map((doc) => toEffectiveInstructionFile(doc, false, appliesBecause(doc, targetPath)));

  return {
    targetPath: targetPath || undefined,
    instructionFiles: dedupeEffectiveInstructions([...inheritedEntries, ...localEntries.sort(compareEffectiveInstructions)])
  };
}

function compareEffectiveInstructions(left: EffectiveInstructionFile, right: EffectiveInstructionFile): number {
  const leftRank = instructionRank(left);
  const rightRank = instructionRank(right);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftDepth = left.path.split('/').length;
  const rightDepth = right.path.split('/').length;
  if (leftDepth !== rightDepth) {
    return leftDepth - rightDepth;
  }

  return left.path.localeCompare(right.path);
}

function instructionRank(entry: EffectiveInstructionFile): number {
  if (entry.scope === 'repo') {
    return 0;
  }

  if (entry.path.endsWith('/AGENTS.md')) {
    return 1;
  }

  return 2;
}

function appliesToTarget(doc: AgentInstructionDocFact, targetPath: string): boolean {
  if (!targetPath) {
    return doc.scope === 'repo';
  }

  if (doc.scope === 'repo') {
    return true;
  }

  if (doc.appliesTo?.some((pattern) => safeMinimatch(targetPath, pattern))) {
    return true;
  }

  if (doc.tool === 'cursor') {
    return doc.metadata?.alwaysApply === true;
  }

  if (doc.path.endsWith('/AGENTS.md')) {
    const directory = doc.path.slice(0, -'AGENTS.md'.length);
    const directoryTarget = directory.replace(/\/$/, '');
    return targetPath === directoryTarget || targetPath.startsWith(directory);
  }

  return false;
}

function appliesBecause(doc: AgentInstructionDocFact, targetPath: string): string {
  if (doc.scope === 'repo') {
    return 'repo-level instruction applies to all paths under the requested root';
  }

  const matchingGlob = doc.appliesTo?.find((pattern) => safeMinimatch(targetPath, pattern));
  if (matchingGlob) {
    return `target path matches scoped pattern ${matchingGlob}`;
  }

  if (doc.tool === 'cursor' && doc.metadata?.alwaysApply === true) {
    return 'Cursor rule has alwaysApply=true';
  }

  if (doc.path.endsWith('/AGENTS.md')) {
    const directory = doc.path.slice(0, -'AGENTS.md'.length);
    const directoryTarget = directory.replace(/\/$/, '');
    return targetPath === directoryTarget ? `target path is ${directoryTarget}` : `target path is under ${directory}`;
  }

  return 'instruction surface applies to the requested target path';
}

function toEffectiveInstructionFile(doc: AgentInstructionDocFact, inherited: boolean, appliesBecause: string): EffectiveInstructionFile {
  return {
    path: doc.path,
    type: doc.tool,
    scope: doc.scope,
    appliesTo: doc.appliesTo,
    metadata: doc.metadata,
    source: doc.source,
    inherited,
    inheritedFrom: inherited ? doc.inheritedFrom ?? 'workspace-parent' : doc.inheritedFrom,
    displayPath: inherited ? doc.displayPath ?? `<workspace-parent>/${doc.path}` : doc.displayPath,
    appliesBecause
  };
}

function dedupeEffectiveInstructions(entries: EffectiveInstructionFile[]): EffectiveInstructionFile[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.inherited ? 'inherited' : 'local'}:${entry.path}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function safeMinimatch(path: string, pattern: string): boolean {
  try {
    return minimatch(path, normalizePath(pattern), { dot: true });
  } catch {
    return false;
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}
