import path from 'node:path';

type PathModule = Pick<typeof path, 'isAbsolute' | 'relative' | 'resolve'>;

export class UsagePathError extends Error {}

export function normalizeRootContainedPath(root: string, inputPath: string): string {
  return normalizeRootContainedPathWith(path, root, inputPath);
}

export function normalizeRootContainedPathWith(pathModule: PathModule, root: string, inputPath: string): string {
  const resolvedRoot = pathModule.resolve(root);
  const normalizedInput = inputPath.replace(/\\/g, pathModule === path.win32 ? '\\' : path.sep);
  const resolvedTarget = pathModule.resolve(resolvedRoot, normalizedInput);
  const rawRelativePath = pathModule.relative(resolvedRoot, resolvedTarget);

  if (isOutsideRoot(pathModule, rawRelativePath)) {
    throw new UsagePathError('--path must stay inside --root');
  }

  return rawRelativePath.replace(/\\/g, '/') || '.';
}

function isOutsideRoot(pathModule: PathModule, relativePath: string): boolean {
  return (
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    relativePath.startsWith('..\\') ||
    pathModule.isAbsolute(relativePath)
  );
}
