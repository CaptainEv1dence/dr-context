import { describe, expect, test } from 'vitest';
import { join } from 'node:path';
import { runCli } from '../src/cli/main.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

const originalCwd = process.cwd();

describe('drctx CLI', () => {
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
});

async function runInFixture(args: string[], fixture: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  process.chdir(join(fixturesRoot, fixture));
  try {
    return await runCli(['node', 'drctx', ...args]);
  } finally {
    process.chdir(originalCwd);
  }
}
