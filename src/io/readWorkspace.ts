import fg from 'fast-glob';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { RawFile, ScanResourceSummary, ScanSkippedFile } from '../core/types.js';
import { instructionSurfaceGlobs } from '../extractors/instructionSurfaces.js';
import { defaultWorkspaceResourceLimits, type WorkspaceResourceLimits } from './resourceLimits.js';

export type WorkspaceDiscoveryConfig = {
  include: string[];
  exclude: string[];
  limits?: Partial<WorkspaceResourceLimits>;
  returnResource?: boolean;
  onAfterStatForTest?: (path: string) => Promise<void>;
};

export type WorkspaceReadResult = {
  files: RawFile[];
  resource: ScanResourceSummary;
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

export function readWorkspace(root: string, config?: WorkspaceDiscoveryConfig & { returnResource?: false }): Promise<RawFile[]>;
export function readWorkspace(root: string, config: WorkspaceDiscoveryConfig & { returnResource: true }): Promise<WorkspaceReadResult>;
export async function readWorkspace(
  root: string,
  config: WorkspaceDiscoveryConfig = { include: [], exclude: [] }
): Promise<RawFile[] | WorkspaceReadResult> {
  const paths = await fg([...defaultIncludeGlobs, ...config.include], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    unique: true,
    ignore: [...defaultExcludeGlobs, ...config.exclude]
  });
  const canonicalPaths = await Promise.all(paths.map((path) => canonicalRelativePath(root, normalizePath(path))));
  const sortedPaths = uniqueCaseInsensitive(canonicalPaths).sort(comparePaths);
  const limits = { ...defaultWorkspaceResourceLimits, ...(config.limits ?? {}) };
  const files: RawFile[] = [];
  const skippedFiles: ScanSkippedFile[] = [];
  let bytesRead = 0;

  for (const path of sortedPaths) {
    if (files.length >= limits.maxFiles) {
      skippedFiles.push({ path, reason: 'file-count-limit' });
      continue;
    }

    const sizeBytes = await fileSize(root, path);
    if (sizeBytes !== undefined && sizeBytes > limits.maxFileBytes) {
      skippedFiles.push({ path, reason: 'file-too-large', sizeBytes, limitBytes: limits.maxFileBytes });
      continue;
    }
    if (sizeBytes !== undefined && bytesRead + sizeBytes > limits.maxTotalBytes) {
      skippedFiles.push({ path, reason: 'total-bytes-limit', sizeBytes, limitBytes: limits.maxTotalBytes });
      continue;
    }

    await config.onAfterStatForTest?.(path);
    const file = await readOptionalFile(root, path, sizeBytes);
    if (file !== undefined) {
      bytesRead += file.sizeBytes ?? Buffer.byteLength(file.content, 'utf8');
      files.push(file);
    }
  }

  const result = {
    files,
    resource: {
      filesRead: files.length,
      bytesRead,
      skippedFiles,
      hitLimit: skippedFiles.length > 0
    }
  };

  return config.returnResource ? result : result.files;
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

async function fileSize(root: string, path: string): Promise<number | undefined> {
  try {
    return (await stat(join(root, path))).size;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

async function readOptionalFile(root: string, path: string, sizeBytes?: number): Promise<RawFile | undefined> {
  try {
    return {
      path,
      content: await readFile(join(root, path), 'utf8'),
      sizeBytes
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}
