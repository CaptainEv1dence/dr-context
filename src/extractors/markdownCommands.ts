import type { CommandMention, RawFile } from '../core/types.js';
import { normalizePackageManagerCommand } from '../core/packageManagerIntent.js';

export function extractMarkdownCommands(files: RawFile[]): CommandMention[] {
  return files.flatMap((file) => extractMarkdownCommandsFromFile(file));
}

function extractMarkdownCommandsFromFile(file: RawFile): CommandMention[] {
  if (!isMarkdownLike(file.path)) {
    return [];
  }

  const mentions: CommandMention[] = [];
  let inFence = false;

  for (const [index, line] of file.content.split('\n').entries()) {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }

    mentions.push(...extractInlineCommandsFromLine(file.path, line, lineNumber));

    if (inFence && startsWithPackageManager(trimmed)) {
      mentions.push({
        command: trimmed,
        packageManager: normalizePackageManagerCommand(trimmed),
        context: 'code-block',
        source: {
          file: file.path,
          line: lineNumber,
          text: trimmed
        }
      });
    }
  }

  return mentions;
}

function extractInlineCommandsFromLine(file: string, line: string, lineNumber: number): CommandMention[] {
  const mentions: CommandMention[] = [];
  const inlineCode = line.matchAll(/`([^`]+)`/g);

  for (const match of inlineCode) {
    const command = match[1].trim();
    if (startsWithPackageManager(command)) {
      mentions.push({
        command,
        packageManager: normalizePackageManagerCommand(command),
        context: 'inline-code',
        source: {
          file,
          line: lineNumber,
          text: line.trim()
        }
      });
    }
  }

  return mentions;
}

function startsWithPackageManager(command: string): boolean {
  if (!normalizePackageManagerCommand(command)) {
    return false;
  }

  return !/^npm\s+token\b/i.test(command);
}

function isMarkdownLike(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.mdx') || path.endsWith('.mdc');
}
