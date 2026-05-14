import fg from 'fast-glob';

const defaultIgnoreGlobs = ['.git/**', 'node_modules/**', 'dist/**', 'coverage/**', '.turbo/**', '.next/**', '.cache/**'];

export async function listWorkspaceFilePaths(root: string): Promise<string[]> {
  const paths = await fg(['**/*'], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: defaultIgnoreGlobs
  });

  return [...new Set(paths.map(normalizePath))].sort(comparePaths);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function comparePaths(left: string, right: string): number {
  const leftLower = left.toLowerCase();
  const rightLower = right.toLowerCase();

  if (leftLower < rightLower) {
    return -1;
  }

  if (leftLower > rightLower) {
    return 1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}
