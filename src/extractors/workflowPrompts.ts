import { parse } from 'yaml';
import type { RawFile, WorkflowPrompt, WorkflowPromptKind } from '../core/types.js';

type WorkflowStep = {
  uses?: unknown;
  with?: Record<string, unknown>;
};

type WorkflowShape = {
  jobs?: Record<string, { steps?: unknown[] }>;
};

type StepRange = {
  start: number;
  end: number;
};

type ClaudeArgToken = {
  value: string;
  quoted: boolean;
};

const claudeActionPattern = /^anthropics\/(?:claude-code-action|claude-code-base-action)(?:@.+)?$/;

const promptInputs: Record<string, WorkflowPromptKind> = {
  custom_instructions: 'custom-instructions',
  prompt: 'prompt',
  direct_prompt: 'direct-prompt'
};

export function extractWorkflowPrompts(files: RawFile[]): WorkflowPrompt[] {
  return files.filter((file) => isGitHubWorkflow(file.path)).flatMap((file) => extractWorkflowPromptsFromFile(file));
}

function extractWorkflowPromptsFromFile(file: RawFile): WorkflowPrompt[] {
  const workflow = parseWorkflow(file.content);
  if (!workflow?.jobs) {
    return [];
  }

  const lines = normalizedLines(file.content);
  const prompts: WorkflowPrompt[] = [];
  let previousStepStart = -1;

  for (const job of Object.values(workflow.jobs)) {
    if (!Array.isArray(job.steps)) {
      continue;
    }

    for (const step of job.steps) {
      if (!isWorkflowStep(step) || typeof step.uses !== 'string' || !isClaudeAction(step.uses)) {
        continue;
      }

      const range = findStepRange(lines, step.uses, previousStepStart + 1);
      if (!range) {
        continue;
      }
      previousStepStart = range.start;

      if (!step.with) {
        continue;
      }

      for (const [key, kind] of Object.entries(promptInputs)) {
        const value = step.with[key];
        if (typeof value !== 'string') {
          continue;
        }

        const source = findInputSource(file.path, lines, range, key);
        if (!source) {
          continue;
        }

        prompts.push({ kind, action: step.uses, value, source });
      }

      const claudeArgs = step.with.claude_args;
      if (typeof claudeArgs === 'string') {
        prompts.push(...extractClaudeArgsPrompts(file.path, lines, range, step.uses, claudeArgs));
      }
    }
  }

  return prompts;
}

function parseWorkflow(content: string): WorkflowShape | undefined {
  try {
    const parsed = parse(content) as WorkflowShape | null;
    return parsed ?? undefined;
  } catch {
    return undefined;
  }
}

function isWorkflowStep(value: unknown): value is WorkflowStep {
  return typeof value === 'object' && value !== null;
}

function isClaudeAction(action: string): boolean {
  return claudeActionPattern.test(action);
}

function extractClaudeArgsPrompts(
  file: string,
  lines: string[],
  range: StepRange,
  action: string,
  claudeArgs: string
): WorkflowPrompt[] {
  const prompts: WorkflowPrompt[] = [];
  const tokens = tokenizeClaudeArgs(claudeArgs);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const equalMatch = token.value.match(/^(--system-prompt|--append-system-prompt)=(.+)$/s);
    const flag = equalMatch?.[1] ?? token.value;
    if (flag !== '--system-prompt' && flag !== '--append-system-prompt') {
      continue;
    }

    const valueToken = equalMatch
      ? { value: equalMatch[2], quoted: token.quoted }
      : acceptableSeparateValue(tokens, index + 1);
    const rawValue = valueToken?.value;
    if (!rawValue) {
      continue;
    }

    const source = findFlagSource(file, lines, range, flag, rawValue);
    if (!source) {
      continue;
    }

    prompts.push({
      kind: flag === '--system-prompt' ? 'system-prompt' : 'append-system-prompt',
      action,
      value: rawValue,
      source
    });
  }

  return prompts;
}

function acceptableSeparateValue(tokens: ClaudeArgToken[], valueIndex: number): ClaudeArgToken | undefined {
  const valueToken = tokens[valueIndex];
  if (!valueToken || valueToken.value.startsWith('--')) {
    return undefined;
  }

  const followingToken = tokens[valueIndex + 1];
  if (!valueToken.quoted && followingToken && !followingToken.value.startsWith('--')) {
    return undefined;
  }

  return valueToken;
}

function tokenizeClaudeArgs(value: string): ClaudeArgToken[] {
  const tokens: ClaudeArgToken[] = [];
  const tokenPattern = /(?:\S+=)"([^"]*)"|(?:\S+=)'([^']*)'|"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const match of value.matchAll(tokenPattern)) {
    const rawToken = match[0];
    if (rawToken.includes('=') && (match[1] !== undefined || match[2] !== undefined)) {
      tokens.push({ value: `${rawToken.slice(0, rawToken.indexOf('=') + 1)}${match[1] ?? match[2] ?? ''}`, quoted: true });
      continue;
    }

    tokens.push({ value: match[3] ?? match[4] ?? match[5] ?? '', quoted: match[3] !== undefined || match[4] !== undefined });
  }
  return tokens;
}

function findStepRange(lines: string[], action: string, startAt: number): StepRange | undefined {
  const usesPattern = new RegExp(`^\\s*-?\\s*uses:\\s*${escapeRegExp(action)}\\s*$`);

  for (let index = startAt; index < lines.length; index += 1) {
    const line = lines[index];
    if (!usesPattern.test(line.trimEnd())) {
      continue;
    }

    const stepIndent = indentation(line);
    let end = lines.length;
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (nextLine.trim() === '') {
        continue;
      }

      if (indentation(nextLine) <= stepIndent && /^\s*-\s+[^:]+:/.test(nextLine)) {
        end = nextIndex;
        break;
      }
    }

    return { start: index, end };
  }

  return undefined;
}

function findInputSource(file: string, lines: string[], range: StepRange, key: string): WorkflowPrompt['source'] | undefined {
  const inputPattern = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*`);
  for (let index = range.start; index < range.end; index += 1) {
    if (inputPattern.test(lines[index])) {
      return { file, line: index + 1, text: lines[index].trim() };
    }
  }

  return undefined;
}

function findFlagSource(
  file: string,
  lines: string[],
  range: StepRange,
  flag: '--system-prompt' | '--append-system-prompt',
  value: string
): WorkflowPrompt['source'] | undefined {
  for (let index = range.start; index < range.end; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.includes(flag) && lineContainsFlagValue(trimmed, flag, value)) {
      return { file, line: index + 1, text: trimmed };
    }
  }

  return undefined;
}

function lineContainsFlagValue(line: string, flag: string, value: string): boolean {
  return (
    line.includes(`${flag}=${value}`) ||
    line.includes(`${flag}="${value}"`) ||
    line.includes(`${flag}='${value}'`) ||
    line.includes(`${flag} ${value}`) ||
    line.includes(`${flag} "${value}"`) ||
    line.includes(`${flag} '${value}'`)
  );
}

function normalizedLines(content: string): string[] {
  return content.split('\n').map((line) => line.replace(/\r$/, ''));
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isGitHubWorkflow(path: string): boolean {
  return /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path);
}
