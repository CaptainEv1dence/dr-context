import fg from 'fast-glob';

const defaultIgnoreGlobs = ['.git/**', 'node_modules/**', 'dist/**', 'coverage/**', '.turbo/**', '.next/**', '.cache/**'];

export type WorkspaceFilePathInventory = {
  paths: string[];
  truncated: boolean;
};

export function listWorkspaceFilePaths(root: string): Promise<string[]>;
export function listWorkspaceFilePaths(root: string, config: { maxFiles: number }): Promise<WorkspaceFilePathInventory>;
export async function listWorkspaceFilePaths(root: string, config?: { maxFiles: number }): Promise<string[] | WorkspaceFilePathInventory> {
  if (config) {
    return listBoundedWorkspaceFilePaths(root, config.maxFiles);
  }

  const paths = await fg(['**/*'], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: defaultIgnoreGlobs
  });

  const sortedPaths = [...new Set(paths.map(normalizePath))].sort(comparePaths);
  return sortedPaths;
}

async function listBoundedWorkspaceFilePaths(root: string, maxFiles: number): Promise<WorkspaceFilePathInventory> {
  const paths = new Set<string>();
  let truncated = false;
  const stream = fg.stream(['**/*'], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: defaultIgnoreGlobs
  });

  for await (const entry of stream) {
    paths.add(normalizePath(String(entry)));
    if (paths.size > maxFiles) {
      truncated = true;
      break;
    }
  }

  return {
    paths: [...paths].sort(comparePaths).slice(0, maxFiles),
    truncated
  };
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
