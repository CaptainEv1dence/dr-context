import type { PackageManagerName } from './types.js';

export const jsPackageManagers: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun'];

export function normalizePackageManagerCommand(command: string): PackageManagerName | undefined {
  const [first, second] = command.trim().split(/\s+/, 2);

  if (first === 'corepack') {
    const corepackManager = second?.match(/^(npm|pnpm|yarn|bun)(?:@[^\s]+)?$/);
    return corepackManager ? corepackManager[1] as PackageManagerName : undefined;
  }

  return jsPackageManagers.find((manager) => first === manager);
}
