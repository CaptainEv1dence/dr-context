import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { toolVersion } from '../version.js';
import type { CandidateType, DiscoverReport, DiscoveryCandidate } from './types.js';

export type DiscoverConfig = {
  maxDepth: number;
};

const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', '.turbo', '.next', '.cache']);
const agentSignals = ['AGENTS.md', 'CLAUDE.md', '.cursorrules', '.github/copilot-instructions.md'];
const workspaceSignals = ['pnpm-workspace.yaml'];
const packageSignals = ['package.json', ...workspaceSignals, 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];
const orderedSignals = ['.git', ...agentSignals, ...packageSignals];

export async function discoverCandidates(root: string, config: DiscoverConfig): Promise<DiscoverReport> {
  const candidates = await walk(root, '.', 0, config.maxDepth);

  return {
    schemaVersion: 'drctx.discover.v1',
    tool: 'drctx',
    toolVersion,
    root: '<requested-root>',
    maxDepth: config.maxDepth,
    candidates: candidates.sort((left, right) => comparePaths(left.path, right.path)),
    summary: {
      candidates: candidates.length
    }
  };
}

async function walk(root: string, relativePath: string, depth: number, maxDepth: number): Promise<DiscoveryCandidate[]> {
  const absolutePath = relativePath === '.' ? root : join(root, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);
  const candidates = candidateFromEntries(relativePath, names);

  if (depth >= maxDepth) {
    return candidates ? [candidates] : [];
  }

  const childCandidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .filter((entry) => !ignoredDirectories.has(entry.name))
      .map((entry) => walk(root, relativePath === '.' ? entry.name : `${relativePath}/${entry.name}`, depth + 1, maxDepth))
  );

  return [...(candidates ? [candidates] : []), ...childCandidates.flat()];
}

function candidateFromEntries(path: string, names: string[]): DiscoveryCandidate | undefined {
  const nameSet = new Set(names);
  const signals = orderedSignals.filter((signal) => directSignalExists(signal, nameSet));

  if (signals.length === 0) {
    return undefined;
  }

  return {
    path,
    type: candidateType(signals),
    signals
  };
}

function directSignalExists(signal: string, names: Set<string>): boolean {
  return !signal.includes('/') && names.has(signal);
}

function candidateType(signals: string[]): CandidateType {
  if (signals.includes('.git')) {
    return 'git-repository';
  }

  if (signals.some((signal) => agentSignals.includes(signal))) {
    return 'agent-context-root';
  }

  return 'package-root';
}

function comparePaths(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (left === '.') {
    return -1;
  }

  if (right === '.') {
    return 1;
  }

  return left.localeCompare(right);
}
