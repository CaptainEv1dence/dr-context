import { describe, expect, test } from 'vitest';
import { extractWorkflowPrompts } from '../src/extractors/workflowPrompts.js';
import type { RawFile } from '../src/core/types.js';

function workflow(content: string): RawFile {
  return { path: '.github/workflows/agent.yml', content };
}

describe('extractWorkflowPrompts', () => {
  test('extracts custom_instructions from anthropics/claude-code-action@v1 with source line/text', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          custom_instructions: Always run pnpm test before committing.\n`
      )
    ]);

    expect(prompts).toEqual([
      {
        kind: 'custom-instructions',
        action: 'anthropics/claude-code-action@v1',
        value: 'Always run pnpm test before committing.',
        source: {
          file: '.github/workflows/agent.yml',
          line: 6,
          text: 'custom_instructions: Always run pnpm test before committing.'
        }
      }
    ]);
  });

  test('extracts prompt and legacy direct_prompt from anthropics/claude-code-base-action@main', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-base-action@main\n        with:\n          prompt: Review this pull request.\n          direct_prompt: Fix the issue and open a PR.\n`
      )
    ]);

    expect(prompts.map((prompt) => [prompt.kind, prompt.action, prompt.value, prompt.source.line])).toEqual([
      ['prompt', 'anthropics/claude-code-base-action@main', 'Review this pull request.', 6],
      ['direct-prompt', 'anthropics/claude-code-base-action@main', 'Fix the issue and open a PR.', 7]
    ]);
  });

  test('extracts claude_args --append-system-prompt "Never skip tests" as append-system-prompt', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: --append-system-prompt "Never skip tests"\n`
      )
    ]);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      kind: 'append-system-prompt',
      action: 'anthropics/claude-code-action@v1',
      value: 'Never skip tests',
      source: { file: '.github/workflows/agent.yml', line: 6, text: 'claude_args: --append-system-prompt "Never skip tests"' }
    });
  });

  test('extracts claude_args --system-prompt "Focus on security" as system-prompt', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: --system-prompt "Focus on security"\n`
      )
    ]);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      kind: 'system-prompt',
      action: 'anthropics/claude-code-action@v1',
      value: 'Focus on security',
      source: { file: '.github/workflows/agent.yml', line: 6, text: 'claude_args: --system-prompt "Focus on security"' }
    });
  });

  test('extracts equals-form claude_args prompt flags with quoted values', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: --system-prompt="Focus on security" --append-system-prompt="Never skip tests"\n`
      )
    ]);

    expect(prompts.map((prompt) => [prompt.kind, prompt.value, prompt.source.line])).toEqual([
      ['system-prompt', 'Focus on security', 6],
      ['append-system-prompt', 'Never skip tests', 6]
    ]);
  });

  test('extracts block scalar claude_args with --append-system-prompt on line 8, not line 7', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: |\n            --model claude-sonnet-4-5\n            --append-system-prompt "Run lint before final response"\n`
      )
    ]);

    expect(prompts).toHaveLength(1);
    expect(prompts[0].value).toBe('Run lint before final response');
    expect(prompts[0].source.line).toBe(8);
    expect(prompts[0].source.text).toBe('--append-system-prompt "Run lint before final response"');
  });

  test('ties source lines to the owning Claude step when two Claude steps have the same input key', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          custom_instructions: First prompt.\n      - uses: anthropics/claude-code-action@v1\n        with:\n          custom_instructions: Second prompt.\n`
      )
    ]);

    expect(prompts.map((prompt) => [prompt.value, prompt.source.line])).toEqual([
      ['First prompt.', 6],
      ['Second prompt.', 9]
    ]);
  });

  test('stops source lookup before following non-Claude step list items', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          prompt: Claude prompt.\n      - id: later-action\n        uses: actions/github-script@v8\n        with:\n          prompt: ignored following prompt\n`
      )
    ]);

    expect(prompts).toEqual([
      {
        kind: 'prompt',
        action: 'anthropics/claude-code-action@v1',
        value: 'Claude prompt.',
        source: {
          file: '.github/workflows/agent.yml',
          line: 6,
          text: 'prompt: Claude prompt.'
        }
      }
    ]);
  });

  test('preserves ${{ secrets.ANTHROPIC_API_KEY }} literally without resolving secrets', () => {
    const prompts = extractWorkflowPrompts([
      workflow(
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          prompt: Use token ${{ secrets.ANTHROPIC_API_KEY }} only through the action input.\n'
      )
    ]);

    expect(prompts[0].value).toBe('Use token ${{ secrets.ANTHROPIC_API_KEY }} only through the action input.');
  });

  test('ignores non-Claude actions and non-workflow YAML files', () => {
    const prompts = extractWorkflowPrompts([
      workflow(`jobs:\n  test:\n    steps:\n      - uses: actions/checkout@v6\n        with:\n          prompt: ignored\n`),
      { path: 'configs/agent.yml', content: 'custom_instructions: ignored' }
    ]);

    expect(prompts).toEqual([]);
  });
});
