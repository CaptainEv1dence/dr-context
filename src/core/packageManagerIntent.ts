import type { PackageManagerName } from './types.js';

export const jsPackageManagers: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun'];

export function normalizePackageManagerCommand(command: string): PackageManagerName | undefined {
  const [first, second] = command.trim().split(/\s+/, 2);

  if (first === 'corepack') {
    const corepackManager = second?.match(/^(pnpm)(?:@[^\s]+)?$/);
    return corepackManager ? 'pnpm' : undefined;
  }

  return jsPackageManagers.find((manager) => first === manager);
}
