import type { Check, CheckContext, Finding, PackageManagerEvidence, PackageManagerName } from '../core/types.js';

const jsPackageManagers: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun'];

export const packageManagerMismatchCheck: Check = {
  id: 'package-manager-mismatch',
  run(context: CheckContext): Finding[] {
    const multipleLockfiles = multiplePackageLockfilesFinding(context.facts.packageManagers);
    if (multipleLockfiles) {
      return [multipleLockfiles];
    }

    const canonical = findCanonicalPackageManager(context.facts.packageManagers);
    if (!canonical || canonical.name === 'unknown') {
      return [];
    }

    return context.facts.commandMentions.flatMap((mention) => {
      const mentionedManager = commandManager(mention.command);
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
  }
};

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
  return (
    packageManagers.find((manager) => manager.source.file === 'package.json' && jsPackageManagers.includes(manager.name)) ??
    packageManagers.find((manager) => jsPackageManagers.includes(manager.name))
  );
}

function commandManager(command: string): PackageManagerName | undefined {
  return jsPackageManagers.find((manager) => command === manager || command.startsWith(`${manager} `));
}
