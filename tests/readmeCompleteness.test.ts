import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function writeFixture(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-readme-completeness-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  roots.push(root);
  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const fullPath = join(root, path);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, content, 'utf8');
    })
  );
  return root;
}

async function scan(files: Record<string, string>) {
  return runScan(await writeFixture(files), { strict: false, include: [], exclude: [] });
}

const packageJson = JSON.stringify({ scripts: { test: 'vitest run' }, packageManager: 'pnpm@10.0.0' }, null, 2);
const ci = 'name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack pnpm test\n';

describe('README verification completeness scan', () => {
  test('reports README missing local verification guidance when CI has a verification command', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRun tests with `pnpm test`.',
      'README.md': '# Project\n\nInstall dependencies with pnpm.',
      'package.json': packageJson,
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': ci
    });

    const findings = report.findings.filter((finding) => finding.id === 'missing-readme-verification');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'info',
      confidence: 'medium',
      primarySource: { file: 'README.md', line: 1, text: '# Project' },
      suggestion: 'Add a README verification section with the local CI-backed command, such as `corepack pnpm test`.'
    });
    expect(findings[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'readme', message: 'README.md does not include recognizable local verification guidance.' }),
        expect.objectContaining({ kind: 'ci-command', message: '.github/workflows/ci.yml:7 runs `corepack pnpm test`.' })
      ])
    );
  });

  test('does not report README when it includes the CI-backed verification command', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRun tests with `pnpm test`.',
      'README.md': '# Project\n\n## Verification\n\nRun `corepack pnpm test` before opening a PR.',
      'package.json': packageJson,
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': ci
    });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(0);
  });

  test('does not report README when it includes the package-manager alias for a corepack CI command', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRun tests with `pnpm test`.',
      'README.md': '# Project\n\n## Verification\n\nRun `pnpm test` before opening a PR.',
      'package.json': packageJson,
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': ci
    });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(0);
  });

  test('reports only the first CI verification command that README omits', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRun tests with `pnpm test`.',
      'README.md': '# Project\n\n## Verification\n\nRun `corepack pnpm lint` before opening a PR.',
      'package.json': JSON.stringify({ scripts: { lint: 'eslint .', test: 'vitest run' }, packageManager: 'pnpm@10.0.0' }, null, 2),
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': 'name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack pnpm lint\n      - run: corepack pnpm test\n'
    });

    const findings = report.findings.filter((finding) => finding.id === 'missing-readme-verification');
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toContain('corepack pnpm test');
  });

  test('does not report README when CI has no local verification command even with weak related words', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nCheck the README when changing docs.',
      'README.md': '# Project\n\nCI and checks are important for releases.',
      'package.json': packageJson,
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': 'name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: corepack pnpm install\n'
    });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(0);
  });

  test('does not treat weak verification words as enough when CI has a local verification command', async () => {
    const report = await scan({
      'AGENTS.md': '# AGENTS.md\n\nRun tests with `pnpm test`.',
      'README.md': '# Project\n\nWe test ideas before release. CI checks are important.',
      'package.json': packageJson,
      'pnpm-lock.yaml': '',
      '.github/workflows/ci.yml': ci
    });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(1);
  });
});
