import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';
import { fixtureRoot } from './helpers.js';

async function scanFixture(name: string) {
  return runScan(fixtureRoot(name), { strict: false, include: [], exclude: [] });
}

describe('Node runtime drift scan', () => {
  test('reports exact/static Node major mismatches', async () => {
    const report = await scanFixture('node-exact-static-mismatch');
    const findings = report.findings.filter((finding) => finding.id === 'node-runtime-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: '.nvmrc', line: 1 },
      evidence: [
        { kind: 'runtime-version', source: { file: '.nvmrc', line: 1 } },
        { kind: 'runtime-version', source: { file: '.node-version', line: 1 } }
      ],
      suggestion: expect.stringContaining('Align Node runtime declarations')
    });
  });

  test('does not report aligned exact/static Node values', async () => {
    const report = await scanFixture('node-exact-static-aligned');

    expect(report.findings.filter((finding) => finding.id === 'node-runtime-drift')).toHaveLength(0);
  });

  test('does not report overlapping minimum Node ranges', async () => {
    const report = await scanFixture('node-minimum-overlap');

    expect(report.findings.filter((finding) => finding.id === 'node-runtime-drift')).toHaveLength(0);
  });

  test('reports exact/static Node versions below the minimum Node range', async () => {
    const report = await scanFixture('node-minimum-conflict');
    const findings = report.findings.filter((finding) => finding.id === 'node-runtime-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: '.nvmrc', line: 1 },
      evidence: [
        { kind: 'runtime-version', source: { file: '.nvmrc', line: 1 } },
        { kind: 'runtime-version', source: { file: 'package.json', line: 8 } }
      ],
      suggestion: expect.stringContaining('Align Node runtime declarations')
    });
  });

  test('does not report unsupported dynamic Node values', async () => {
    const report = await scanFixture('node-unsupported-lts');

    expect(report.findings.filter((finding) => finding.id === 'node-runtime-drift')).toHaveLength(0);
  });
});

describe('package manager drift scan', () => {
  test('treats pnpm and corepack pnpm commands as the same package manager intent', async () => {
    const report = await scanFixture('package-manager-corepack-pnpm');

    expect(report.findings.filter((finding) => finding.id === 'package-manager-drift')).toHaveLength(0);
  });

  test('treats corepack pnpm@version and pnpm commands as the same package manager intent', async () => {
    const report = await scanFixture('package-manager-corepack-pnpm-version');

    expect(report.findings.filter((finding) => finding.id === 'package-manager-drift')).toHaveLength(0);
  });

  test('reports npm commands that conflict with canonical pnpm intent', async () => {
    const report = await scanFixture('package-manager-npm-conflicts-with-pnpm');
    const findings = report.findings.filter((finding) => finding.id === 'package-manager-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: 'AGENTS.md', line: 3 },
      suggestion: 'Replace `npm test` with `pnpm test`.'
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'command-mention', source: expect.objectContaining({ file: 'AGENTS.md', line: 3 }) }),
        expect.objectContaining({ kind: 'package-manager', source: expect.objectContaining({ file: 'package.json', line: 3 }) })
      ])
    );
    expect(report.findings.filter((finding) => finding.id === 'package-manager-mismatch')).toHaveLength(0);
  });

  test('reports a lockfile that conflicts with package.json packageManager intent', async () => {
    const report = await scanFixture('package-manager-lockfile-conflicts-with-package-json');
    const findings = report.findings.filter((finding) => finding.id === 'package-manager-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: 'package-lock.json', line: 1 },
      suggestion: expect.stringContaining('pnpm')
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'lockfile', source: expect.objectContaining({ file: 'package-lock.json', line: 1 }) }),
        expect.objectContaining({ kind: 'package-manager', source: expect.objectContaining({ file: 'package.json', line: 3 }) })
      ])
    );
  });

  test('reports setup-action package manager conflicts with package.json packageManager intent', async () => {
    const report = await scanFixture('package-manager-setup-action-conflicts-with-package-json');
    const findings = report.findings.filter((finding) => finding.id === 'package-manager-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: '.github/workflows/ci.yml', line: 6 },
      suggestion: expect.stringContaining('pnpm')
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'setup-action', source: expect.objectContaining({ file: '.github/workflows/ci.yml', line: 6 }) }),
        expect.objectContaining({ kind: 'package-manager', source: expect.objectContaining({ file: 'package.json', line: 3 }) })
      ])
    );
  });

  test('does not treat corepack enable alone as a package manager command', async () => {
    const report = await scanFixture('package-manager-corepack-enable-only');

    expect(report.findings.filter((finding) => finding.id === 'package-manager-drift')).toHaveLength(0);
  });
});

describe('verification command conflict scan', () => {
  test('reports strong AGENTS, CI, and package-script verification mismatches', async () => {
    const report = await scanFixture('verification-command-strong-mismatch');
    const findings = report.findings.filter((finding) => finding.id === 'verification-command-conflict');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: 'AGENTS.md', line: 3 },
      suggestion: 'Replace `npm test` with `pnpm test` so agent verification matches CI and package.json.'
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'agent-visible-command', source: expect.objectContaining({ file: 'AGENTS.md', line: 3 }) }),
        expect.objectContaining({ kind: 'ci-command', source: expect.objectContaining({ file: '.github/workflows/ci.yml', line: 5 }) }),
        expect.objectContaining({ kind: 'package-json-script', source: expect.objectContaining({ file: 'package.json', line: 5 }) }),
        expect.objectContaining({ kind: 'package-manager', source: expect.objectContaining({ file: 'package.json', line: 3 }) })
      ])
    );
  });

  test('does not report different verification intents as conflicts', async () => {
    const report = await scanFixture('verification-command-different-intent');

    expect(report.findings.filter((finding) => finding.id === 'verification-command-conflict')).toHaveLength(0);
  });

  test('reports versioned Corepack manager verification mismatches', async () => {
    const report = await scanFixture('verification-command-versioned-corepack-mismatch');
    const findings = report.findings.filter((finding) => finding.id === 'verification-command-conflict');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      primarySource: { file: 'AGENTS.md', line: 3 },
      suggestion: 'Replace `corepack yarn@4.1.0 test` with `pnpm test` so agent verification matches CI and package.json.'
    });
  });

  test('does not report README-only weak verification evidence', async () => {
    const report = await scanFixture('verification-command-readme-only');

    expect(report.findings.filter((finding) => finding.id === 'verification-command-conflict')).toHaveLength(0);
  });

  test('does not report shell plumbing as a verification conflict', async () => {
    const report = await scanFixture('verification-command-shell-plumbing');

    expect(report.findings.filter((finding) => finding.id === 'verification-command-conflict')).toHaveLength(0);
  });
});
