import type { PackageManagerName } from '../core/types.js';

export type PackageScriptInvocation = {
  manager: PackageManagerName;
  scriptName: string;
  command: string;
  usesRun: boolean;
};

const scriptManagers: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun'];
const ignoredDirectCommands = new Set([
  'add',
  'ci',
  'create',
  'dlx',
  'exec',
  'i',
  'init',
  'install',
  'link',
  'remove',
  'uninstall',
  'update',
  'upgrade',
  'x'
]);

export function parsePackageScriptInvocation(command: string): PackageScriptInvocation | undefined {
  const parts = normalizeCommandParts(command.trim().split(/\s+/));
  const [manager, subcommand, scriptName] = parts;

  if (!isPackageManager(manager) || !subcommand) {
    return undefined;
  }

  if (subcommand === 'run') {
    if (!scriptName) {
      return undefined;
    }

    return { manager, scriptName, command, usesRun: true };
  }

  if (ignoredDirectCommands.has(subcommand)) {
    return undefined;
  }

  return { manager, scriptName: subcommand, command, usesRun: false };
}

function normalizeCommandParts(parts: string[]): string[] {
  if (parts[0] === 'corepack') {
    const [, manager, ...rest] = parts;
    return manager ? [stripManagerVersion(manager), ...rest] : [];
  }

  return parts;
}

function stripManagerVersion(value: string): string {
  return value.replace(/^([a-z]+)@.+$/, '$1');
}

function isPackageManager(value: string | undefined): value is PackageManagerName {
  return scriptManagers.includes(value as PackageManagerName);
}
