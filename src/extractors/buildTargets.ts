import type { BuildTargetFact, RawFile } from '../core/types.js';

export function extractBuildTargets(files: RawFile[]): BuildTargetFact[] {
  return files.flatMap((file) => {
    if (/^makefile$/i.test(file.path)) {
      return extractColonTargets(file, 'make');
    }

    if (/^justfile$/i.test(file.path)) {
      return extractColonTargets(file, 'just');
    }

    if (/^Taskfile\.ya?ml$/i.test(file.path)) {
      return extractTaskfileTargets(file);
    }

    return [];
  });
}

function extractColonTargets(file: RawFile, tool: 'make' | 'just'): BuildTargetFact[] {
  return lines(file.content).flatMap((line, index) => {
    const match = line.match(/^([A-Za-z0-9_.-]+)\s*:(?![:?+!]?=)/);
    if (!match) {
      return [];
    }

    return [{ tool, name: match[1], source: { file: file.path, line: index + 1 } }];
  });
}

function extractTaskfileTargets(file: RawFile): BuildTargetFact[] {
  const result: BuildTargetFact[] = [];
  const fileLines = lines(file.content);
  let inTasks = false;
  let tasksIndent = 0;

  for (let index = 0; index < fileLines.length; index += 1) {
    const line = fileLines[index];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const indent = indentation(line);
    if (!inTasks) {
      if (trimmed === 'tasks:') {
        inTasks = true;
        tasksIndent = indent;
      }
      continue;
    }

    if (indent <= tasksIndent) {
      inTasks = false;
      continue;
    }

    if (indent !== tasksIndent + 2) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*:/);
    if (match) {
      result.push({ tool: 'taskfile', name: match[1], source: { file: file.path, line: index + 1 } });
    }
  }

  return result;
}

function lines(content: string): string[] {
  return content.split('\n').map((line) => line.replace(/\r$/, ''));
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}
