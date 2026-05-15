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
    ...extractLockfilePackageManager(file),
    ...extractSetupActionPackageManager(file)
  ]);
}

function extractPackageJsonPackageManager(file: RawFile): PackageManagerEvidence[] {
  if (file.path !== 'package.json') {
    return [];
  }

  const match = file.content.match(/"packageManager"\s*:\s*"([^"]+)"/);
  if (!match) {
    return [];
  }

  const raw = match[1];
  const atIndex = raw.lastIndexOf('@');
  const name = atIndex === -1 ? raw : raw.slice(0, atIndex);
  const version = atIndex === -1 ? undefined : raw.slice(atIndex + 1);

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

function extractSetupActionPackageManager(file: RawFile): PackageManagerEvidence[] {
  if (!/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file.path)) {
    return [];
  }

  const facts: PackageManagerEvidence[] = [];
  for (const [index, line] of file.content.split('\n').entries()) {
    const text = line.replace(/\r$/, '').trim();
    const usesMatch = text.match(/^(?:-\s*)?uses:\s*(\S+)/i);
    if (usesMatch) {
      const action = usesMatch[1];
      const name = setupActionPackageManager(action);
      if (name) {
        facts.push({
          name,
          raw: action,
          confidence: 'medium',
          source: { file: file.path, line: index + 1, text }
        });
      }
      continue;
    }

    const cacheMatch = text.match(/^cache:\s*['"]?(npm|pnpm|yarn)['"]?\s*$/i);
    if (cacheMatch) {
      facts.push({
        name: toPackageManagerName(cacheMatch[1].toLowerCase()),
        raw: cacheMatch[1],
        confidence: 'medium',
        source: { file: file.path, line: index + 1, text }
      });
    }
  }

  return facts;
}

function setupActionPackageManager(action: string): PackageManagerName | undefined {
  if (/^pnpm\/action-setup@/i.test(action)) {
    return 'pnpm';
  }

  if (/^oven-sh\/setup-bun@/i.test(action)) {
    return 'bun';
  }

  return undefined;
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
