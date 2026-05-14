import type { CommandMention, RawFile } from '../core/types.js';

const runLinePattern = /^\s*-?\s*run:\s*(.*)$/;

export function extractCiCommands(files: RawFile[]): CommandMention[] {
  return files.filter((file) => isGitHubWorkflow(file.path)).flatMap((file) => extractCiCommandsFromWorkflow(file));
}

function extractCiCommandsFromWorkflow(file: RawFile): CommandMention[] {
  const lines = file.content.split('\n');
  const commands: CommandMention[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\r$/, '');
    const match = line.match(runLinePattern);
    if (!match) {
      continue;
    }

    const rawValue = match[1].trim();
    if (rawValue === '|' || rawValue === '>') {
      const blockIndent = indentation(line) + 2;
      for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
        const blockLine = lines[blockIndex].replace(/\r$/, '');
        if (blockLine.trim() === '') {
          continue;
        }

        if (indentation(blockLine) < blockIndent) {
          break;
        }

        const command = blockLine.trim();
        commands.push(commandMention(file.path, command, blockIndex + 1, command));
      }
      continue;
    }

    if (rawValue !== '') {
      commands.push(commandMention(file.path, stripYamlQuotes(rawValue), index + 1, line.trim()));
    }
  }

  return commands;
}

function commandMention(file: string, command: string, line: number, text: string): CommandMention {
  return {
    command,
    context: 'plain-text',
    source: {
      file,
      line,
      text
    }
  };
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

function isGitHubWorkflow(path: string): boolean {
  return /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path);
}
