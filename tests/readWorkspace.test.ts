import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { readWorkspace } from '../src/io/readWorkspace.js';

const fixtureRoot = join(import.meta.dirname, 'fixtures', 'workspace-discovery');

describe('readWorkspace', () => {
  test('discovers deterministic context-relevant files only', async () => {
    const files = await readWorkspace(fixtureRoot);

    expect(files.map((file) => file.path)).toEqual([
      '.cursor/rules/project.mdc',
      '.github/copilot-instructions.md',
      '.github/ISSUE_TEMPLATE/bug.yml',
      '.github/pull_request_template.md',
      '.github/workflows/ci.yml',
      'AGENTS.md',
      'ARCHITECTURE.md',
      'CLAUDE.md',
      'CONTRIBUTING.md',
      'docs/adr/0001-example.md',
      'docs/CONTRIBUTING.md',
      'docs/SECURITY.md',
      'justfile',
      'Makefile',
      'package.json',
      'pnpm-lock.yaml',
      'SECURITY.md'
    ]);
  });

  test('honors explicit include and exclude globs', async () => {
    const files = await readWorkspace(fixtureRoot, {
      include: ['src/ignored.ts'],
      exclude: ['AGENTS.md']
    });

    expect(files.map((file) => file.path)).toContain('src/ignored.ts');
    expect(files.map((file) => file.path)).not.toContain('AGENTS.md');
  });
});
