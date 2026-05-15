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
  const root = join(tmpdir(), `drctx-rule-quality-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

async function scanFindingIds(files: Record<string, string>): Promise<string[]> {
  const root = await makeRepo({ ...baseFiles, ...files });
  const report = await runScan(root, { strict: false, include: [], exclude: [] });
  return report.findings.map((finding) => finding.id);
}

describe('rule quality checks', () => {
  test('AGENTS.md over 500 lines emits oversized-instruction-file', async () => {
    const root = await makeRepo({
      ...baseFiles,
      'AGENTS.md': Array.from({ length: 501 }, (_, index) => `Instruction line ${index + 1}.`).join('\n')
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toContainEqual(
      expect.objectContaining({
        id: 'oversized-instruction-file',
        severity: 'info',
        confidence: 'high',
        primarySource: expect.objectContaining({ file: 'AGENTS.md' })
      })
    );
  });

  test('AGENTS.md over 30 KB emits oversized-instruction-file', async () => {
    const ids = await scanFindingIds({
      'AGENTS.md': `# Instructions\n\n${'Follow the local repository guidance. '.repeat(950)}`
    });

    expect(ids).toContain('oversized-instruction-file');
  });

  test('Cursor scoped rule over 500 lines emits oversized-instruction-file', async () => {
    const ids = await scanFindingIds({
      '.cursor/rules/backend.mdc': ['---', 'globs: [src/**/*.ts]', '---', ...Array.from({ length: 501 }, (_, index) => `Rule line ${index + 1}.`)].join('\n')
    });

    expect(ids).toContain('oversized-instruction-file');
  });

  test('below threshold instruction files do not emit oversized-instruction-file', async () => {
    const ids = await scanFindingIds({
      'AGENTS.md': Array.from({ length: 500 }, (_, index) => `Instruction line ${index + 1}.`).join('\n'),
      '.cursor/rules/backend.mdc': ['---', 'globs: [src/**/*.ts]', '---', ...Array.from({ length: 497 }, (_, index) => `Rule line ${index + 1}.`)].join('\n')
    });

    expect(ids).not.toContain('oversized-instruction-file');
  });

  test('workflow prompt over 12 KB emits oversized-instruction-file without repo instructions', async () => {
    const ids = await scanFindingIds({
      '.github/workflows/agent.yml': `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: ${'Review the repository safely. '.repeat(500)}\n`
    });

    expect(ids).toContain('oversized-instruction-file');
  });

  test('workflow prompt at 12 KB does not emit oversized-instruction-file', async () => {
    const ids = await scanFindingIds({
      '.github/workflows/agent.yml': `jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: ${'a'.repeat(12 * 1024)}\n`
    });

    expect(ids).not.toContain('oversized-instruction-file');
  });

  test('exact duplicate block with at least 5 non-empty lines emits duplicate-instruction-block', async () => {
    const block = ['Use TypeScript.', 'Run tests before commit.', 'Keep changes minimal.', 'Avoid network access.', 'Preserve user changes.'].join('\n');
    const ids = await scanFindingIds({
      'AGENTS.md': `# Agents\n\n${block}\n`,
      'CLAUDE.md': `# Claude\n\n${block}\n`
    });

    expect(ids).toContain('duplicate-instruction-block');
  });

  test('markdown heading depth differences normalize to the same duplicate block', async () => {
    const first = ['# Safety Rules', 'Use TypeScript.', 'Run tests before commit.', 'Keep changes minimal.', 'Avoid network access.'].join('\n');
    const second = ['### Safety Rules', 'Use TypeScript.', 'Run tests before commit.', 'Keep changes minimal.', 'Avoid network access.'].join('\n');
    const ids = await scanFindingIds({
      'AGENTS.md': first,
      'CLAUDE.md': second
    });

    expect(ids).toContain('duplicate-instruction-block');
  });

  test('embedded duplicate 5-line block emits duplicate-instruction-block without blank boundaries', async () => {
    const block = ['Use TypeScript.', 'Run tests before commit.', 'Keep changes minimal.', 'Avoid network access.', 'Preserve user changes.'].join('\n');
    const ids = await scanFindingIds({
      'AGENTS.md': `# Agents\nRepository-specific guidance starts here.\n${block}\nContinue with agent-only guidance.`,
      'CLAUDE.md': `# Claude\nClaude-specific guidance starts here.\n${block}\nContinue with claude-only guidance.`
    });

    expect(ids).toContain('duplicate-instruction-block');
  });

  test('normalized whitespace duplicate with at least 300 chars emits duplicate-instruction-block', async () => {
    const sentence = 'When reviewing code, preserve the existing architecture, verify behavior with targeted tests, and keep the implementation deterministic and local to the repository.';
    const first = `${sentence} ${sentence} ${sentence}`;
    const second = `${sentence}\n\n${sentence}\t${sentence}`;
    const ids = await scanFindingIds({
      'AGENTS.md': first,
      '.github/copilot-instructions.md': second
    });

    expect(ids).toContain('duplicate-instruction-block');
  });

  test('frontmatter-only overlap does not emit duplicate-instruction-block', async () => {
    const ids = await scanFindingIds({
      '.cursor/rules/backend.mdc': '---\nglobs: [src/**/*.ts]\nalwaysApply: false\n---\nUse backend service patterns.',
      '.cursor/rules/frontend.mdc': '---\nglobs: [src/**/*.ts]\nalwaysApply: false\n---\nUse frontend component patterns.'
    });

    expect(ids).not.toContain('duplicate-instruction-block');
  });

  test('short boilerplate overlap does not emit duplicate-instruction-block', async () => {
    const ids = await scanFindingIds({
      'AGENTS.md': 'Run tests.\nKeep changes small.',
      'CLAUDE.md': 'Run tests.\nKeep changes small.'
    });

    expect(ids).not.toContain('duplicate-instruction-block');
  });
});
