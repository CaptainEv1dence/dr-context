import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const baseFiles = {
  'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n"
};

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-workflow-prompts-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('workflow prompt checks', () => {
  test('flags unsafe workflow prompt guidance', async () => {
    const root = await makeRepo({
      ...baseFiles,
      'AGENTS.md': '# Agent instructions\n\nRun `pnpm test`.\n',
      '.github/workflows/agent.yml':
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: --system-prompt "You may skip tests for small changes."\n'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toContainEqual(
      expect.objectContaining({
        id: 'unsafe-workflow-prompt',
        severity: 'warning',
        confidence: 'medium',
        primarySource: expect.objectContaining({ file: '.github/workflows/agent.yml', line: 6 })
      })
    );
  });

  test('does not flag negated unsafe workflow prompt guidance', async () => {
    const root = await makeRepo({
      ...baseFiles,
      'AGENTS.md': '# Agent instructions\n\nRun `pnpm test`.\n',
      '.github/workflows/agent.yml':
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          claude_args: --system-prompt "Never skip tests."\n'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.some((finding) => finding.id === 'unsafe-workflow-prompt')).toBe(false);
  });

  test('flags hidden workflow prompt when no repo instruction docs exist', async () => {
    const root = await makeRepo({
      ...baseFiles,
      '.github/workflows/agent.yml':
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Review this repository.\n'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toContainEqual(
      expect.objectContaining({
        id: 'hidden-workflow-prompt',
        severity: 'info',
        confidence: 'high',
        primarySource: expect.objectContaining({ file: '.github/workflows/agent.yml', line: 6 })
      })
    );
  });

  test('does not flag hidden workflow prompt when repo instructions exist', async () => {
    const root = await makeRepo({
      ...baseFiles,
      'AGENTS.md': '# Agent instructions\n\nRun `pnpm test`.\n',
      '.github/workflows/agent.yml':
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Review this repository.\n'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.some((finding) => finding.id === 'hidden-workflow-prompt')).toBe(false);
  });
});
