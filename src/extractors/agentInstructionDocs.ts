import { parse as parseYaml } from 'yaml';
import type { AgentInstructionDocFact, RawFile } from '../core/types.js';
import { getInstructionSurfaceForPath } from './instructionSurfaces.js';

export function extractAgentInstructionDocs(files: RawFile[]): AgentInstructionDocFact[] {
  return files.flatMap((file) => {
    const surface = getInstructionSurfaceForPath(file.path);
    if (!surface) {
      return [];
    }

    const cursorMetadata = surface.tool === 'cursor' ? parseCursorMetadata(file.content) : {};

    return [
      {
        path: file.path,
        content: file.content,
        tool: surface.tool,
        scope: surface.scope,
        source: {
          file: file.path,
          line: 1,
          text: file.content.split('\n')[0]?.trim() ?? ''
        },
        ...cursorMetadata
      }
    ];
  });
}

function parseCursorMetadata(content: string): Pick<AgentInstructionDocFact, 'appliesTo' | 'metadata'> {
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatter);
  } catch {
    return {};
  }

  if (!isRecord(parsed)) {
    return {};
  }

  const appliesTo = [...stringValues(parsed.globs), ...stringValues(parsed.paths)];
  const metadata: NonNullable<AgentInstructionDocFact['metadata']> = { scopedRule: true };
  if (typeof parsed.alwaysApply === 'boolean') {
    metadata.alwaysApply = parsed.alwaysApply;
  }

  return {
    ...(appliesTo.length > 0 ? { appliesTo } : {}),
    metadata
  };
}

function extractFrontmatter(content: string): string | undefined {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return undefined;
  }

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) {
    return undefined;
  }

  const afterDelimiter = normalized[end + 4];
  if (afterDelimiter !== undefined && afterDelimiter !== '\n') {
    return undefined;
  }

  return normalized.slice(4, end);
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
