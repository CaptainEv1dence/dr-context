import type { Check, CheckContext, Finding, RuntimeVersionFact } from '../core/types.js';

type ExactRuntimeVersion = RuntimeVersionFact & { normalizedMajor: number };
type MinimumRuntimeVersion = RuntimeVersionFact & { minimumMajor: number };
type DeterministicRuntimeVersion = ExactRuntimeVersion | MinimumRuntimeVersion;

export const runtimeDriftCheck: Check = {
  id: 'node-runtime-drift',
  run(context: CheckContext): Finding[] {
    const nodeVersions = context.facts.runtimeVersions.filter((fact) => fact.runtime === 'node');
    if (nodeVersions.length < 2 || nodeVersions.some((fact) => fact.unsupportedReason)) {
      return [];
    }

    const deterministicVersions = nodeVersions.filter(isDeterministicRuntimeVersion).sort(runtimeFactOrder);
    if (deterministicVersions.length !== nodeVersions.length) {
      return [];
    }

    const conflict = firstRuntimeConflict(deterministicVersions);
    if (!conflict) {
      return [];
    }

    const [left, right] = conflict;
    return [
      {
        id: this.id,
        title: `Node runtime declarations conflict: ${formatVersion(left)} vs ${formatVersion(right)}`,
        category: 'runtime',
        severity: 'error',
        confidence: lowerConfidence(left, right),
        primarySource: left.source,
        evidence: [runtimeEvidence(left), runtimeEvidence(right)],
        suggestion: 'Align Node runtime declarations so version files, package engines, and CI setup-node use overlapping Node versions.'
      }
    ];
  }
};

function firstRuntimeConflict(facts: DeterministicRuntimeVersion[]): [DeterministicRuntimeVersion, DeterministicRuntimeVersion] | undefined {
  for (let leftIndex = 0; leftIndex < facts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < facts.length; rightIndex += 1) {
      if (!runtimeVersionsOverlap(facts[leftIndex], facts[rightIndex])) {
        return [facts[leftIndex], facts[rightIndex]];
      }
    }
  }

  return undefined;
}

function runtimeVersionsOverlap(left: DeterministicRuntimeVersion, right: DeterministicRuntimeVersion): boolean {
  const leftExact = exactMajor(left);
  const rightExact = exactMajor(right);
  if (leftExact !== undefined && rightExact !== undefined) {
    return leftExact === rightExact;
  }

  if (leftExact !== undefined) {
    return leftExact >= minimumMajor(right);
  }

  if (rightExact !== undefined) {
    return rightExact >= minimumMajor(left);
  }

  return true;
}

function isDeterministicRuntimeVersion(fact: RuntimeVersionFact): fact is DeterministicRuntimeVersion {
  return fact.normalizedMajor !== undefined || fact.minimumMajor !== undefined;
}

function exactMajor(fact: DeterministicRuntimeVersion): number | undefined {
  return fact.normalizedMajor;
}

function minimumMajor(fact: DeterministicRuntimeVersion): number {
  const major = fact.minimumMajor ?? fact.normalizedMajor;
  if (major === undefined) {
    throw new Error('deterministic runtime version is missing a comparable major');
  }

  return major;
}

function formatVersion(fact: DeterministicRuntimeVersion): string {
  return fact.minimumMajor === undefined ? `${fact.normalizedMajor}` : `>=${fact.minimumMajor}`;
}

function lowerConfidence(left: DeterministicRuntimeVersion, right: DeterministicRuntimeVersion): Finding['confidence'] {
  return left.confidence === 'medium' || right.confidence === 'medium' ? 'medium' : 'high';
}

function runtimeEvidence(fact: DeterministicRuntimeVersion): Finding['evidence'][number] {
  return {
    kind: 'runtime-version',
    message: `${fact.source.file}:${fact.source.line} declares Node ${fact.version}.`,
    source: fact.source
  };
}

function runtimeFactOrder(left: RuntimeVersionFact, right: RuntimeVersionFact): number {
  return runtimeKindPriority(left.kind) - runtimeKindPriority(right.kind) || left.source.file.localeCompare(right.source.file);
}

function runtimeKindPriority(kind: RuntimeVersionFact['kind']): number {
  return ['nvmrc', 'node-version', 'package-engines', 'github-actions'].indexOf(kind);
}
