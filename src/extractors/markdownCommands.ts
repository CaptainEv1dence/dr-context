import type { CommandMention, PackageManagerName, RawFile } from '../core/types.js';

const packageManagerCommands: PackageManagerName[] = ['npm', 'pnpm', 'yarn', 'bun'];

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
  return packageManagerCommands.some((manager) => command === manager || command.startsWith(`${manager} `));
}

function isMarkdownLike(path: string): boolean {
  return path.endsWith('.md') || path.endsWith('.mdx') || path.endsWith('.mdc');
}
