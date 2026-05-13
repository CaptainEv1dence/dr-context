import type { RawFile, ScriptFact } from '../core/types.js';
import { lineNumberForIndex, lineTextForIndex } from './sourceLocation.js';

type PackageJsonShape = {
  scripts?: unknown;
};

export function extractPackageJsonScripts(files: RawFile[]): ScriptFact[] {
  return files.flatMap((file) => extractPackageJsonScriptsFromFile(file));
}

function extractPackageJsonScriptsFromFile(file: RawFile): ScriptFact[] {
  if (file.path !== 'package.json') {
    return [];
  }

  const parsed = parsePackageJson(file.content);
  if (!isRecord(parsed.scripts)) {
    return [];
  }

  return Object.entries(parsed.scripts).flatMap(([name, command]) => {
    if (typeof command !== 'string') {
      return [];
    }

    const keyIndex = findJsonKeyIndex(file.content, name);
    return [
      {
        name,
        command,
        source: {
          file: file.path,
          line: keyIndex === undefined ? undefined : lineNumberForIndex(file.content, keyIndex),
          text: keyIndex === undefined ? undefined : lineTextForIndex(file.content, keyIndex)
        }
      }
    ];
  });
}

function parsePackageJson(content: string): PackageJsonShape {
  try {
    return JSON.parse(content) as PackageJsonShape;
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findJsonKeyIndex(content: string, key: string): number | undefined {
  const index = content.search(new RegExp(`"${escapeRegExp(key)}"\\s*:`));
  return index === -1 ? undefined : index;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
