import fg from 'fast-glob';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawFile } from '../core/types.js';
import { instructionSurfaceGlobs } from '../extractors/instructionSurfaces.js';

export type WorkspaceDiscoveryConfig = {
  include: string[];
  exclude: string[];
};

const defaultIncludeGlobs = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  ...instructionSurfaceGlobs.filter((glob) => glob !== '**/AGENTS.md'),
  '.github/workflows/*.{yml,yaml}',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'ARCHITECTURE.md',
  'architecture.md',
  'docs/SECURITY.md',
  'docs/CONTRIBUTING.md',
  'docs/ARCHITECTURE.md',
  'docs/architecture.md',
  'docs/adr/**/*.{md,mdx}',
  'docs/adrs/**/*.{md,mdx}',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/*.{md,yml,yaml}',
  'adr/**/*.{md,mdx}',
  'Makefile',
  'makefile',
  'justfile',
  'Justfile',
  'Taskfile.yml',
  'Taskfile.yaml',
  '.nvmrc',
  '.node-version'
];

const defaultExcludeGlobs = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/coverage/**'];

export async function readWorkspace(
  root: string,
  config: WorkspaceDiscoveryConfig = { include: [], exclude: [] }
): Promise<RawFile[]> {
  const paths = await fg([...defaultIncludeGlobs, ...config.include], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: [...defaultExcludeGlobs, ...config.exclude]
  });
  const canonicalPaths = await Promise.all(paths.map((path) => canonicalRelativePath(root, normalizePath(path))));
  const sortedPaths = uniqueCaseInsensitive(canonicalPaths).sort(comparePaths);
  const files = await Promise.all(sortedPaths.map((path) => readOptionalFile(root, path)));

  return files.filter((file): file is RawFile => file !== undefined);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

async function canonicalRelativePath(root: string, path: string): Promise<string> {
  const segments = path.split('/');
  const canonicalSegments: string[] = [];
  let current = root;

  for (const segment of segments) {
    const entries = await readdir(current, { withFileTypes: true });
    const actualSegment = entries.find((entry) => entry.name.toLowerCase() === segment.toLowerCase())?.name ?? segment;
    canonicalSegments.push(actualSegment);
    current = join(current, actualSegment);
  }

  return canonicalSegments.join('/');
}

function uniqueCaseInsensitive(paths: string[]): string[] {
  const byLowercasePath = new Map<string, string>();

  for (const path of paths) {
    byLowercasePath.set(path.toLowerCase(), path);
  }

  return [...byLowercasePath.values()];
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

async function readOptionalFile(root: string, path: string): Promise<RawFile | undefined> {
  try {
    return {
      path,
      content: await readFile(join(root, path), 'utf8')
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}
