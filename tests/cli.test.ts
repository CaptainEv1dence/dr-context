import { describe, expect, test } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runCli } from '../src/cli/main.js';
import { toolVersion } from '../src/version.js';
import { fixtureRoot } from './helpers.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

const originalCwd = process.cwd();

describe('drctx CLI', () => {
  test('uses drctx as the help command name when invoked through drctx', async () => {
    const result = await runCli(['node', 'drctx', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: drctx');
  });

  test('uses dr-context as the help command name when invoked through dr-context', async () => {
    const result = await runCli(['node', 'dr-context', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: dr-context');
  });

  test('uses dr-context as the help command name when invoked through the package shim', async () => {
    const result = await runCli(['node', 'dist/cli/main.js', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: dr-context');
  });

  test('prints the tool version', async () => {
    const result = await runCli(['node', 'dr-context', '--version']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(toolVersion);
  });

  test('prints baseline and suppression options in help', async () => {
    const result = await runCli(['node', 'dr-context', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('baseline');
    expect(result.stdout).toContain('--config <path>');
    expect(result.stdout).toContain('--show-suppressed');
  });

  test('root command scans the current directory', async () => {
    const result = await runInFixture([], 'clean-repo');

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No context rot found.');
  });

  test('check subcommand scans the current directory', async () => {
    const result = await runInFixture(['check'], 'clean-repo');

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No context rot found.');
  });

  test('prints JSON reports with --json', async () => {
    const result = await runInFixture(['check', '--json'], 'clean-repo');

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 'drctx.report.v1',
      summary: { errors: 0, warnings: 0, infos: 0 }
    });
  });

  test('prints workflow prompt findings in JSON reports', async () => {
    const root = await makeSyntheticRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1"}',
      'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
      'AGENTS.md': '# Agent instructions\n',
      '.github/workflows/agent.yml': `jobs:
  agent:
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          claude_args: --system-prompt "You may skip tests for small changes."
`
    });

    const result = await runCli(['node', 'dr-context', 'check', '--json', '--root', root]);
    const report = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'unsafe-workflow-prompt' })]));
  });

  test('prints manifest JSON reports', async () => {
    const result = await runInFixture(['manifest', '--json'], 'clean-repo');
    const output = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(output).toMatchObject({
      schemaVersion: 'drctx.manifest.v1',
      root: '<requested-root>',
      packageManager: { name: 'pnpm' }
    });
  });

  test('prints manifest JSON reports with instruction surface metadata', async () => {
    const result = await runInFixture(['manifest', '--json'], 'copilot-instructions');
    const output = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(output.agentInstructionFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '.github/copilot-instructions.md', type: 'copilot', scope: 'repo' })
      ])
    );
  });

  test('manifest --path emits effective instruction files', async () => {
    const result = await runCli(['node', 'dr-context', 'manifest', '--json', '--root', fixtureRoot('scoped-context'), '--path', 'backend/src/api.ts']);
    const manifest = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(manifest.targetPath).toBe('backend/src/api.ts');
    expect(manifest.effectiveInstructionFiles.map((entry: { path: string }) => entry.path)).toEqual([
      'AGENTS.md',
      'backend/AGENTS.md',
      '.cursor/rules/backend.mdc'
    ]);
  });

  test('manifest --path emits effective instruction files for directory targets', async () => {
    const result = await runCli(['node', 'dr-context', 'manifest', '--json', '--root', fixtureRoot('scoped-context'), '--path', 'backend']);
    const manifest = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(manifest.targetPath).toBe('backend');
    expect(manifest.effectiveInstructionFiles.map((entry: { path: string }) => entry.path)).toEqual([
      'AGENTS.md',
      'backend/AGENTS.md'
    ]);
  });

  test('manifest --path rejects paths outside root', async () => {
    const result = await runCli(['node', 'dr-context', 'manifest', '--root', fixtureRoot('scoped-context'), '--path', '../outside.ts']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Dr. Context usage error');
    expect(result.stderr).not.toContain('internal error');
    expect(result.stderr).toContain('must stay inside --root');
  });

  test('manifest --path JSON redacts root and normalizes target path', async () => {
    const root = fixtureRoot('scoped-context');
    const result = await runCli(['node', 'dr-context', 'manifest', '--json', '--root', root, '--path', './backend\\src\\api.ts']);
    const manifest = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(manifest.root).toBe('<requested-root>');
    expect(JSON.stringify(manifest)).not.toContain(root);
    expect(manifest.targetPath).toBe('backend/src/api.ts');
  });

  test('manifest --path accepts absolute paths inside root', async () => {
    const root = fixtureRoot('scoped-context');
    const absoluteTarget = resolve(root, 'backend/src/api.ts');
    const result = await runCli(['node', 'dr-context', 'manifest', '--json', '--root', root, '--path', absoluteTarget]);
    const manifest = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(manifest.targetPath).toBe('backend/src/api.ts');
  });

  test('plain manifest JSON keeps compatibility shape without path fields', async () => {
    const result = await runCli(['node', 'dr-context', 'manifest', '--json', '--root', fixtureRoot('scoped-context')]);
    const manifest = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(manifest).not.toHaveProperty('targetPath');
    expect(manifest).not.toHaveProperty('effectiveInstructionFiles');
    expect(manifest.summary).not.toHaveProperty('effectiveInstructionFiles');
  });

  test('limits workspace text findings with --max-findings', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli([
      'node',
      'drctx',
      'check',
      '--workspace',
      '--max-findings',
      '0',
      '--root',
      join(fixturesRoot, 'discover-workspace')
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Scanned 3 candidate root(s).');
    expect(result.stdout).not.toContain('missing-verification-command');
  });

  test('prints workspace summary only', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli([
      'node',
      'drctx',
      'check',
      '--workspace',
      '--summary-only',
      '--root',
      join(fixturesRoot, 'discover-workspace')
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Totals:');
    expect(result.stdout).not.toContain('package-only:');
  });

  test('prints workspace JSON reports with --workspace and redacted root', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--json', '--root', join(fixturesRoot, 'discover-workspace')]);
    const output = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(output).toMatchObject({
      schemaVersion: 'drctx.workspace-report.v1',
      root: '<requested-root>',
      summary: { roots: 3, errors: 0, warnings: 1, infos: 1 }
    });
    expect(output.reports.map((entry: { path: string }) => entry.path)).toEqual(['.', 'package-only', 'repo-a']);
    expect(JSON.stringify(output)).not.toContain(join(fixturesRoot, 'discover-workspace'));
  });

  test('prints workspace text reports with --workspace', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--root', join(fixturesRoot, 'discover-workspace')]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Dr. Context Workspace');
    expect(result.stdout).toContain('Scanned 3 candidate root(s).');
    expect(result.stdout).toContain('package-only: 0 error(s), 0 warning(s), 1 info(s)');
    expect(result.stdout).not.toContain(join(fixturesRoot, 'discover-workspace'));
  });

  test('requires --workspace for --inherit-parent-instructions', async () => {
    const result = await runCli([
      'node',
      'drctx',
      'check',
      '--root',
      fixtureRoot('workspace-inheritance'),
      '--inherit-parent-instructions'
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Dr. Context usage error');
    expect(result.stderr).not.toContain('internal error');
    expect(result.stderr).toContain('--inherit-parent-instructions requires --workspace');
  });

  test('prints SARIF reports with --sarif', async () => {
    const result = await runInFixture(['check', '--sarif'], 'missing-package-script');
    const output = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(output).toMatchObject({
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'Dr. Context' } }
        }
      ]
    });
    expect(output.runs[0].results).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'stale-package-script-reference', level: 'error' })])
    );
  });

  test('applies global JSON option before check subcommand', async () => {
    const result = await runInFixture(['--json', 'check'], 'clean-repo');

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 'drctx.report.v1',
      summary: { errors: 0, warnings: 0, infos: 0 }
    });
  });

  test('returns exit code 1 for error findings', async () => {
    const result = await runInFixture(['check'], 'missing-package-script');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Docs reference missing package script "test:unit"');
  });

  test('returns exit code 1 for warning findings in strict mode', async () => {
    const result = await runInFixture(['check', '--strict'], 'ci-doc-command-mismatch');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('CI runs "lint" but agent instructions do not mention it');
  });

  test('returns exit code 1 for workspace warning findings in strict mode', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--strict', '--root', join(fixturesRoot, 'discover-workspace')]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('repo-a: 0 error(s), 1 warning(s), 0 info(s)');
  });

  test('applies global strict option before check subcommand', async () => {
    const result = await runInFixture(['--strict', 'check'], 'ci-doc-command-mismatch');

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('CI runs "lint" but agent instructions do not mention it');
  });

  test('scans an explicit root path with check --root', async () => {
    const result = await runCli([
      'node',
      'drctx',
      'check',
      '--json',
      '--root',
      join(fixturesRoot, 'npm-repo-missing-test-instructions')
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      root: join(fixturesRoot, 'npm-repo-missing-test-instructions'),
      summary: { errors: 0, warnings: 1, infos: 0 }
    });
  });

  test('discovers candidate repository roots as JSON', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli(['node', 'drctx', 'discover', '--json', '--root', join(fixturesRoot, 'discover-workspace')]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 'drctx.discover.v1',
      root: '<requested-root>',
      maxDepth: 3,
      candidates: [
        { path: '.', type: 'agent-context-root', signals: ['AGENTS.md'] },
        { path: 'package-only', type: 'package-root', signals: ['package.json'] },
        { path: 'repo-a', type: 'git-repository', signals: ['.git', 'AGENTS.md', 'package.json'] }
      ],
      summary: { candidates: 3 }
    });
  });

  test('discovers candidate repository roots as text', async () => {
    await mkdir(join(fixturesRoot, 'discover-workspace', 'repo-a', '.git'), { recursive: true });
    const result = await runCli(['node', 'drctx', 'discover', '--root', join(fixturesRoot, 'discover-workspace')]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dr. Context Discover');
    expect(result.stdout).toContain('Found 3 candidate root(s).');
    expect(result.stdout).toContain('1. . (agent-context-root)');
    expect(result.stdout).toContain('- AGENTS.md');
    expect(result.stdout).toContain('3. repo-a (git-repository)');
    expect(result.stdout).not.toContain(join(fixturesRoot, 'discover-workspace'));
  });

  test('returns exit code 2 for invalid discover max depth', async () => {
    const result = await runCli(['node', 'drctx', 'discover', '--root', join(fixturesRoot, 'discover-workspace'), '--max-depth', 'nope']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Dr. Context usage error: --max-depth must be a non-negative integer');
    expect(result.stderr).not.toContain('internal error');
  });
});

async function runInFixture(args: string[], fixture: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  process.chdir(join(fixturesRoot, fixture));
  try {
    return await runCli(['node', 'drctx', ...args]);
  } finally {
    process.chdir(originalCwd);
  }
}

async function makeSyntheticRepo(files: Record<string, string>): Promise<string> {
  const root = join(import.meta.dirname, '..', 'node_modules', '.tmp', `drctx-cli-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}
