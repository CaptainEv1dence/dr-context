import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-coverage-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('coverage signal checks', () => {
  test('reports no scannable context instead of treating an empty repo as clean', async () => {
    const report = await runScan(join(fixturesRoot, 'no-scannable-context'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary).toMatchObject({ errors: 0, warnings: 0, infos: 1 });
    expect(report.findings).toEqual([
      expect.objectContaining({
        id: 'no-scannable-context',
        severity: 'info',
        confidence: 'high',
        title: 'No supported context or repo fact files were found'
      })
    ]);
  });

  test('reports missing agent instructions when repo facts exist but no agent-visible instructions exist', async () => {
    const report = await runScan(join(fixturesRoot, 'no-agent-instructions'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.filter((finding) => finding.id === 'no-agent-instructions')).toEqual([
      expect.objectContaining({
        severity: 'info',
        confidence: 'high',
        suggestion: 'Add an AGENTS.md or another supported agent instruction file with exact verification commands and first-read docs.'
      })
    ]);
  });

  test('does not emit actionable warnings when no agent instructions exist', async () => {
    const report = await runScan(join(fixturesRoot, 'no-agent-instructions-with-test-script'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.map((finding) => finding.id)).toEqual(['no-agent-instructions']);
    expect(report.summary).toMatchObject({ errors: 0, warnings: 0, infos: 1 });
  });

  test('treats extracted workflow prompts as scannable repo facts', async () => {
    const root = await makeRepo({
      '.github/workflows/agent.yml':
        'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Review this repository.\n'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.some((finding) => finding.id === 'no-scannable-context')).toBe(false);
    expect(report.findings.map((finding) => finding.id)).toContain('no-agent-instructions');
    expect(report.findings.map((finding) => finding.id)).toContain('hidden-workflow-prompt');
  });
});
