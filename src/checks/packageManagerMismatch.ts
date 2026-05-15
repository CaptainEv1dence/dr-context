import type { Check, CheckContext, Finding, PackageManagerEvidence } from '../core/types.js';
import { jsPackageManagers, normalizePackageManagerCommand } from '../core/packageManagerIntent.js';

const jsLockfiles = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']);

export const packageManagerMismatchCheck: Check = {
  // Docs-command package manager mismatches are folded into the broader 0.3.5 drift finding.
  id: 'package-manager-drift',
  run(context: CheckContext): Finding[] {
    const multipleLockfiles = multiplePackageLockfilesFinding(context.facts.packageManagers);
    if (multipleLockfiles) {
      return [multipleLockfiles];
    }

    const canonical = findCanonicalPackageManager(context.facts.packageManagers);
    if (!canonical || canonical.name === 'unknown') {
      return [];
    }

    const evidenceFindings = context.facts.packageManagers.flatMap((manager) => {
      if (manager === canonical || manager.name === canonical.name || !jsPackageManagers.includes(manager.name)) {
        return [];
      }

      return [packageManagerEvidenceFinding(this.id, canonical, manager)];
    });

    const commandFindings: Finding[] = context.facts.commandMentions.flatMap((mention) => {
      const mentionedManager = mention.packageManager ?? normalizePackageManagerCommand(mention.command);
      if (!mentionedManager || mentionedManager === canonical.name) {
        return [];
      }

      const lockfile = context.facts.packageManagers.find(
        (manager) => manager.name === canonical.name && manager.source.file.endsWith('lock.yaml')
      );

      return [
        {
          id: this.id,
          title: `Docs mention ${mentionedManager}, but this repo uses ${canonical.name}`,
          category: 'package-manager',
          severity: 'error',
          confidence: canonical.confidence,
          primarySource: mention.source,
          evidence: [
            {
              kind: 'command-mention',
              message: `${mention.source.file}:${mention.source.line} mentions \`${mention.command}\`.`,
              source: mention.source
            },
            {
              kind: 'package-manager',
              message: `${canonical.source.file} declares packageManager: ${canonical.raw ?? canonical.name}.`,
              source: canonical.source
            },
            ...(lockfile
              ? [
                  {
                    kind: 'lockfile',
                    message: `${lockfile.source.file} indicates ${lockfile.name}.`,
                    source: lockfile.source
                  }
                ]
              : [])
          ],
          suggestion: `Replace \`${mention.command}\` with \`${canonical.name}${mention.command.slice(mentionedManager.length)}\`.`
        }
      ];
    });

    return [...evidenceFindings, ...commandFindings];
  }
};

function packageManagerEvidenceFinding(
  id: string,
  canonical: PackageManagerEvidence,
  manager: PackageManagerEvidence
): Finding {
  const kind = packageManagerEvidenceKind(manager);
  return {
    id,
    title: `${sourceLabel(manager)} indicates ${manager.name}, but this repo uses ${canonical.name}`,
    category: 'package-manager',
    severity: 'error',
    confidence: canonical.confidence,
    primarySource: manager.source,
    evidence: [
      {
        kind,
        message: `${manager.source.file} indicates ${manager.name}.`,
        source: manager.source
      },
      {
        kind: 'package-manager',
        message: `${canonical.source.file} declares packageManager: ${canonical.raw ?? canonical.name}.`,
        source: canonical.source
      }
    ],
    suggestion: `Align ${manager.source.file} with the canonical ${canonical.name} package manager intent.`
  };
}

function multiplePackageLockfilesFinding(packageManagers: PackageManagerEvidence[]): Finding | undefined {
  const lockfiles = packageManagers.filter(
    (manager) => jsPackageManagers.includes(manager.name) && manager.source.file !== 'package.json'
  );
  const names = new Set(lockfiles.map((manager) => manager.name));

  if (names.size < 2) {
    return undefined;
  }

  return {
    id: 'multiple-package-lockfiles',
    title: 'Multiple JavaScript package manager lockfiles were found',
    category: 'package-manager',
    severity: 'warning',
    confidence: 'high',
    primarySource: lockfiles[0].source,
    evidence: lockfiles.map((manager) => ({
      kind: 'lockfile',
      message: `${manager.source.file} indicates ${manager.name}.`,
      source: manager.source
    })),
    suggestion: 'Keep one JavaScript package manager lockfile and remove stale lockfiles so agents use the intended package manager.'
  };
}

function findCanonicalPackageManager(packageManagers: PackageManagerEvidence[]): PackageManagerEvidence | undefined {
  const packageJson = packageManagers.find(
    (manager) => manager.source.file === 'package.json' && jsPackageManagers.includes(manager.name)
  );
  if (packageJson) {
    return packageJson;
  }

  const lockfiles = packageManagers.filter((manager) => isJsLockfile(manager) && jsPackageManagers.includes(manager.name));
  return lockfiles.length === 1 ? lockfiles[0] : undefined;
}

function isJsLockfile(manager: PackageManagerEvidence): boolean {
  return jsLockfiles.has(manager.source.file);
}

function packageManagerEvidenceKind(manager: PackageManagerEvidence): string {
  return isJsLockfile(manager) ? 'lockfile' : 'setup-action';
}

function sourceLabel(manager: PackageManagerEvidence): string {
  return isJsLockfile(manager) ? 'Lockfile' : 'Setup action';
}
