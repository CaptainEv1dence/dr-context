import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCli } from '../src/cli/main.js';

const repoWithWarning = {
  'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"lint":"eslint ."}}',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
  'AGENTS.md': '# Agent instructions\n'
};

describe('baseline command', () => {
  test('writes baseline JSON with stable fingerprints', async () => {
    const root = await makeRepo(repoWithWarning);
    const output = join(root, '.drctx-baseline.json');

    const result = await runCli(['node', 'dr-context', 'baseline', '--root', root, '--output', output]);
    const baseline = JSON.parse(await readFile(output, 'utf8'));

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(baseline).toMatchObject({
      schemaVersion: 'drctx.baseline.v1',
      tool: 'drctx',
      root: '<requested-root>'
    });
    expect(baseline.findings).toHaveLength(1);
    expect(baseline.findings[0]).toMatchObject({
      id: 'missing-verification-command',
      file: 'package.json',
      title: 'Verification script "lint" is not mentioned in agent instructions'
    });
    expect(baseline.findings[0].fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(baseline)).not.toContain(root);
    expect(JSON.stringify(baseline)).not.toContain('eslint .');
  });

  test('configured baseline suppresses known findings from check exit code', async () => {
    const root = await makeRepo(repoWithWarning);
    const output = join(root, '.drctx-baseline.json');

    await runCli(['node', 'dr-context', 'baseline', '--root', root, '--output', output]);
    await writeFile(join(root, '.drctx.json'), JSON.stringify({ baseline: '.drctx-baseline.json' }));

    const result = await runCli(['node', 'dr-context', 'check', '--root', root]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No context rot found.');
    expect(result.stdout).toContain('Suppressed findings: 1');
  });

  test('JSON reports omit suppressed findings unless requested', async () => {
    const root = await makeRepo(repoWithWarning);
    const output = join(root, '.drctx-baseline.json');

    await runCli(['node', 'dr-context', 'baseline', '--root', root, '--output', output]);
    await writeFile(join(root, '.drctx.json'), JSON.stringify({ baseline: '.drctx-baseline.json' }));

    const hiddenResult = await runCli(['node', 'dr-context', 'check', '--json', '--root', root]);
    const hiddenReport = JSON.parse(hiddenResult.stdout);
    const shownResult = await runCli(['node', 'dr-context', 'check', '--json', '--show-suppressed', '--root', root]);
    const shownReport = JSON.parse(shownResult.stdout);

    expect(hiddenResult.exitCode).toBe(0);
    expect(hiddenReport.summary.suppressed).toBe(1);
    expect(hiddenReport).not.toHaveProperty('suppressedFindings');
    expect(shownResult.exitCode).toBe(0);
    expect(shownReport.summary.suppressed).toBe(1);
    expect(shownReport.suppressedFindings).toHaveLength(1);
    expect(shownReport.suppressedFindings[0].fingerprint).toMatch(/^sha256:/);
  });

  test('explicit invalid config via check returns exit 2 and usage error', async () => {
    const root = await makeRepo({
      ...repoWithWarning,
      'configs/invalid.json': JSON.stringify({ nope: true })
    });

    const result = await runCli(['node', 'dr-context', 'check', '--root', root, '--config', 'configs/invalid.json']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Dr. Context usage error');
    expect(result.stderr).not.toContain('internal error');
  });

  test('workspace reports aggregate suppressed findings', async () => {
    const root = await makeRepo({
      'AGENTS.md': '# Workspace root\n\nRun `pnpm test`.\n',
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
      'packages/api/AGENTS.md': '# API package\n\nRun `pnpm test`.\n',
      'packages/api/package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run","lint":"eslint ."}}',
      'packages/api/pnpm-lock.yaml': "lockfileVersion: '9.0'\n"
    });
    const baselinePath = join(root, 'packages/api/.drctx-baseline.json');

    await runCli(['node', 'dr-context', 'baseline', '--root', join(root, 'packages/api'), '--output', baselinePath]);
    await writeFile(join(root, '.drctx.json'), JSON.stringify({ baseline: 'packages/api/.drctx-baseline.json' }));

    const result = await runCli(['node', 'dr-context', 'check', '--workspace', '--json', '--show-suppressed', '--root', root]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(report.summary.suppressed).toBeGreaterThan(0);
    expect(JSON.stringify(report)).toContain('suppressedFindings');
  });

  test('SARIF omits suppressed findings by default', async () => {
    const root = await makeRepo(repoWithWarning);
    const baselinePath = join(root, '.drctx-baseline.json');

    await runCli(['node', 'dr-context', 'baseline', '--root', root, '--output', baselinePath]);
    await writeFile(join(root, '.drctx.json'), JSON.stringify({ baseline: '.drctx-baseline.json' }));

    const result = await runCli(['node', 'dr-context', 'check', '--sarif', '--root', root]);
    const sarif = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(sarif.runs[0].results).toEqual([]);
  });
});

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(import.meta.dirname, '..', 'node_modules', '.tmp', `drctx-baseline-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}
