import type { RawFile, RuntimeVersionFact } from '../core/types.js';
import { lineNumberForIndex } from './sourceLocation.js';

type PackageJsonShape = {
  engines?: {
    node?: unknown;
  };
};

export function extractRuntimeVersions(files: RawFile[]): RuntimeVersionFact[] {
  return files.flatMap((file) => {
    if (file.path === '.nvmrc') {
      const versionLine = firstNonEmptyLine(file.content);
      return runtimeVersion(file, versionLine?.text, 'nvmrc', versionLine?.line);
    }

    if (file.path === '.node-version') {
      const versionLine = firstNonEmptyLine(file.content);
      return runtimeVersion(file, versionLine?.text, 'node-version', versionLine?.line);
    }

    if (file.path === 'package.json') {
      return extractPackageEngine(file);
    }

    if (/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file.path)) {
      return extractGitHubActionNodeVersions(file);
    }

    return [];
  });
}

function extractPackageEngine(file: RawFile): RuntimeVersionFact[] {
  const parsed = parsePackageJson(file.content);
  if (typeof parsed.engines?.node !== 'string') {
    return [];
  }

  const keyIndex = file.content.search(/"node"\s*:/);
  return runtimeVersion(file, parsed.engines.node, 'package-engines', keyIndex === -1 ? undefined : lineNumberForIndex(file.content, keyIndex));
}

function extractGitHubActionNodeVersions(file: RawFile): RuntimeVersionFact[] {
  const fileLines = lines(file.content);
  const facts: RuntimeVersionFact[] = [];

  for (let index = 0; index < fileLines.length; index += 1) {
    const stepMatch = fileLines[index].match(/^(\s*)-\s+/);
    if (!stepMatch) {
      continue;
    }

    const stepIndent = stepMatch[1].length;
    const stepLines: { text: string; line: number }[] = [{ text: fileLines[index], line: index + 1 }];
    for (let nextIndex = index + 1; nextIndex < fileLines.length; nextIndex += 1) {
      const line = fileLines[nextIndex];
      if (line.trim() !== '' && indentation(line) <= stepIndent) {
        break;
      }

      stepLines.push({ text: line, line: nextIndex + 1 });
    }

    if (!stepLines.some(({ text }) => /uses:\s*actions\/setup-node@/i.test(text))) {
      continue;
    }

    for (const { text, line } of stepLines) {
      const match = text.match(/^\s*node-version:\s*(.+?)\s*$/);
      if (match) {
        facts.push(...runtimeVersion(file, stripYamlQuotes(match[1].trim()), 'github-actions', line));
        break;
      }
    }
  }

  return facts;
}

function runtimeVersion(
  file: RawFile,
  version: string | undefined,
  kind: RuntimeVersionFact['kind'],
  line: number | undefined
): RuntimeVersionFact[] {
  if (!version) {
    return [];
  }

  return [{ runtime: 'node', version, ...normalizeNodeVersion(version), kind, source: { file: file.path, line } }];
}

function normalizeNodeVersion(version: string): Pick<RuntimeVersionFact, 'normalizedMajor' | 'minimumMajor' | 'unsupportedReason' | 'confidence'> {
  const trimmed = version.trim();
  const exact = trimmed.match(/^v?(\d+)(?:\.\d+){0,2}$/);
  if (exact) {
    return { normalizedMajor: Number(exact[1]), confidence: 'high' };
  }

  const wildcard = trimmed.match(/^v?(\d+)\.(?:x|\*)$/i);
  if (wildcard) {
    return { normalizedMajor: Number(wildcard[1]), confidence: 'high' };
  }

  const minimum = trimmed.match(/^>=(\d+)(?:\.\d+){0,2}$/);
  if (minimum) {
    return { minimumMajor: Number(minimum[1]), confidence: 'medium' };
  }

  return { unsupportedReason: dynamicNodeVersion(trimmed) ? 'dynamic' : 'unsupported' };
}

function dynamicNodeVersion(version: string): boolean {
  return (
    /^(?:lts\/\*|node|latest)$/i.test(version) ||
    version.includes('${{') ||
    version.startsWith('$') ||
    version.startsWith('matrix.') ||
    version.startsWith('*')
  );
}

function firstNonEmptyLine(content: string): { text: string; line: number } | undefined {
  const fileLines = lines(content);
  for (let index = 0; index < fileLines.length; index += 1) {
    const text = fileLines[index].trim();
    if (text !== '') {
      return { text, line: index + 1 };
    }
  }

  return undefined;
}

function parsePackageJson(content: string): PackageJsonShape {
  try {
    return JSON.parse(content) as PackageJsonShape;
  } catch {
    return {};
  }
}

function lines(content: string): string[] {
  return content.split('\n').map((line) => line.replace(/\r$/, ''));
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function stripYamlQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
