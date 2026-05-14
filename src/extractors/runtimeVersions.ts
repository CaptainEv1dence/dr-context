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
      return runtimeVersion(file, firstNonEmptyLine(file.content), 'nvmrc', 1);
    }

    if (file.path === '.node-version') {
      return runtimeVersion(file, firstNonEmptyLine(file.content), 'node-version', 1);
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
  return lines(file.content).flatMap((line, index) => {
    const match = line.match(/^\s*node-version:\s*(.+?)\s*$/);
    if (!match) {
      return [];
    }

    return runtimeVersion(file, stripYamlQuotes(match[1].trim()), 'github-actions', index + 1);
  });
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

  return [{ runtime: 'node', version, kind, source: { file: file.path, line } }];
}

function firstNonEmptyLine(content: string): string | undefined {
  return lines(content).map((line) => line.trim()).find((line) => line !== '');
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

function stripYamlQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
