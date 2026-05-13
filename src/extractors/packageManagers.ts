import type { PackageManagerEvidence, PackageManagerName, RawFile } from '../core/types.js';
import { lineNumberForIndex, lineTextForIndex } from './sourceLocation.js';

const lockfileManagers = new Map<string, PackageManagerName>([
  ['package-lock.json', 'npm'],
  ['npm-shrinkwrap.json', 'npm'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun']
]);

export function extractPackageManagers(files: RawFile[]): PackageManagerEvidence[] {
  return files.flatMap((file) => [
    ...extractPackageJsonPackageManager(file),
    ...extractLockfilePackageManager(file)
  ]);
}

function extractPackageJsonPackageManager(file: RawFile): PackageManagerEvidence[] {
  if (file.path !== 'package.json') {
    return [];
  }

  const match = file.content.match(/^\s*"packageManager"\s*:\s*"([^"]+)"/m);
  if (!match) {
    return [];
  }

  const raw = match[1];
  const [name, version] = raw.split('@');

  return [
    {
      name: toPackageManagerName(name),
      version,
      raw,
      confidence: 'high',
      source: {
        file: file.path,
        line: lineNumberForIndex(file.content, match.index ?? 0),
        text: lineTextForIndex(file.content, match.index ?? 0)
      }
    }
  ];
}

function extractLockfilePackageManager(file: RawFile): PackageManagerEvidence[] {
  const name = lockfileManagers.get(file.path);
  if (!name) {
    return [];
  }

  return [
    {
      name,
      confidence: 'medium',
      source: {
        file: file.path,
        line: 1,
        text: file.path
      }
    }
  ];
}

function toPackageManagerName(value: string): PackageManagerName {
  switch (value) {
    case 'npm':
    case 'pnpm':
    case 'yarn':
    case 'bun':
    case 'uv':
    case 'poetry':
    case 'pip':
    case 'cargo':
    case 'go':
      return value;
    default:
      return 'unknown';
  }
}
