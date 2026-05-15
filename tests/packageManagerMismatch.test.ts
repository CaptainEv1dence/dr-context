import { describe, expect, test } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runScan } from '../src/core/runScan.js';

const fixturesRoot = join(import.meta.dirname, 'fixtures');

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-package-manager-drift-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('package manager drift scan', () => {
  test('reports npm commands in docs when package.json declares pnpm without legacy duplicate findings', async () => {
    const report = await runScan(join(fixturesRoot, 'pnpm-repo-with-npm-docs'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary.errors).toBe(1);
    expect(report.findings).toHaveLength(1);
    expect(report.findings.filter((finding) => finding.id === 'package-manager-mismatch')).toHaveLength(0);

    const finding = report.findings[0];
    expect(finding).toMatchObject({
      id: 'package-manager-drift',
      category: 'package-manager',
      severity: 'error',
      confidence: 'high',
      primarySource: {
        file: 'AGENTS.md',
        line: 3,
        text: 'Run tests with `npm test`.'
      },
      suggestion: 'Replace `npm test` with `pnpm test`.'
    });

    expect(finding.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'command-mention',
          message: 'AGENTS.md:3 mentions `npm test`.'
        }),
        expect.objectContaining({
          kind: 'package-manager',
          message: 'package.json declares packageManager: pnpm@9.12.0.'
        }),
        expect.objectContaining({
          kind: 'lockfile',
          message: 'pnpm-lock.yaml indicates pnpm.'
        })
      ])
    );
  });

  test('does not report matching pnpm docs in the clean fixture', async () => {
    const report = await runScan(join(fixturesRoot, 'clean-repo'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.summary.errors).toBe(0);
    expect(report.findings).toHaveLength(0);
  });

  test('reports multiple JavaScript lockfiles before choosing a canonical package manager', async () => {
    const report = await runScan(join(fixturesRoot, 'multiple-js-lockfiles'), {
      strict: false,
      include: [],
      exclude: []
    });

    expect(report.findings.filter((finding) => finding.id === 'package-manager-mismatch')).toHaveLength(0);
    expect(report.findings.filter((finding) => finding.id === 'multiple-package-lockfiles')).toEqual([
      expect.objectContaining({
        category: 'package-manager',
        severity: 'warning',
        confidence: 'high',
        title: 'Multiple JavaScript package manager lockfiles were found',
        suggestion: 'Keep one JavaScript package manager lockfile and remove stale lockfiles so agents use the intended package manager.'
      })
    ]);
  });

  test.each(['npm', 'yarn', 'bun'] as const)(
    'uses a valid generic suggestion when %s repos conflict with corepack pnpm docs',
    async (manager) => {
      const root = await makeRepo({
        'package.json': JSON.stringify({ packageManager: `${manager}@1.0.0`, scripts: { test: 'vitest run' } }),
        'AGENTS.md': 'Run tests with `corepack pnpm test`.'
      });
      const report = await runScan(root, { strict: false, include: [], exclude: [] });
      const findings = report.findings.filter((finding) => finding.id === 'package-manager-drift');

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        primarySource: { file: 'AGENTS.md', line: 1, text: 'Run tests with `corepack pnpm test`.' },
        suggestion: `Align \`corepack pnpm test\` with the canonical ${manager} package manager intent.`
      });
      expect(findings[0]?.suggestion).not.toContain(`${manager}pack`);
      expect(findings[0]?.evidence).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'command-mention',
            message: 'AGENTS.md:1 mentions `corepack pnpm test`.',
            source: expect.objectContaining({ file: 'AGENTS.md', line: 1 })
          }),
          expect.objectContaining({
            kind: 'package-manager',
            message: `package.json declares packageManager: ${manager}@1.0.0.`,
            source: expect.objectContaining({ file: 'package.json', line: 1 })
          })
        ])
      );
    }
  );

  test.each([
    {
      name: 'setup action',
      workflow: 'name: ci\non: [push]\njobs:\n  test:\n    steps:\n      - uses: oven-sh/setup-bun@v2\n',
      primarySource: { file: '.github/workflows/ci.yml', line: 6 },
      evidenceKind: 'setup-action'
    },
    {
      name: 'setup-node cache',
      workflow: 'name: ci\non: [push]\njobs:\n  test:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: yarn\n',
      primarySource: { file: '.github/workflows/ci.yml', line: 8 },
      evidenceKind: 'setup-action'
    }
  ])('reports package-manager drift, not multiple lockfiles, for one lockfile plus conflicting $name', async (fixture) => {
    const root = await makeRepo({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', scripts: { test: 'vitest run' } }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Run tests with `pnpm test`.',
      '.github/workflows/ci.yml': fixture.workflow
    });
    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'multiple-package-lockfiles')).toHaveLength(0);
    expect(report.findings.filter((finding) => finding.id === 'package-manager-drift')).toEqual([
      expect.objectContaining({
        primarySource: expect.objectContaining(fixture.primarySource),
        evidence: expect.arrayContaining([
          expect.objectContaining({ kind: fixture.evidenceKind, source: expect.objectContaining(fixture.primarySource) }),
          expect.objectContaining({ kind: 'package-manager', source: expect.objectContaining({ file: 'package.json', line: 1 }) })
        ])
      })
    ]);
  });

  test('reports corepack yarn docs as package-manager drift', async () => {
    const root = await makeRepo({
      'package.json': JSON.stringify({ packageManager: 'npm@10.0.0', scripts: { test: 'vitest run' } }),
      'AGENTS.md': 'Run tests with `corepack yarn test`.'
    });
    const report = await runScan(root, { strict: false, include: [], exclude: [] });
    const findings = report.findings.filter((finding) => finding.id === 'package-manager-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      title: 'Docs mention yarn, but this repo uses npm',
      primarySource: { file: 'AGENTS.md', line: 1, text: 'Run tests with `corepack yarn test`.' },
      suggestion: 'Align `corepack yarn test` with the canonical npm package manager intent.'
    });
  });

  test('does not report npm token hygiene commands as package-manager drift', async () => {
    const root = await makeRepo({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', scripts: { test: 'vitest run' } }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Run tests with `pnpm test`.',
      'SECURITY.md': 'If a token leaks, revoke it with `npm token revoke <token-id>`.'
    });

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.map((finding) => finding.id)).not.toContain('package-manager-drift');
  });
});
