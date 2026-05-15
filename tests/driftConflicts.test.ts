import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';
import { fixtureRoot } from './helpers.js';

async function scanFixture(name: string) {
  return runScan(fixtureRoot(name), { strict: false, include: [], exclude: [] });
}

describe('Node runtime drift scan', () => {
  test('reports exact/static Node major mismatches', async () => {
    const report = await scanFixture('node-exact-static-mismatch');

    expect(report.findings.filter((finding) => finding.id === 'node-runtime-drift')).toHaveLength(1);
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

    expect(report.findings.filter((finding) => finding.id === 'node-runtime-drift')).toHaveLength(1);
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

    expect(report.findings.filter((finding) => finding.id === 'package-manager-drift')).toHaveLength(1);
  });
});

describe('verification command conflict scan', () => {
  test('reports strong AGENTS, CI, and package-script verification mismatches', async () => {
    const report = await scanFixture('verification-command-strong-mismatch');

    expect(report.findings.filter((finding) => finding.id === 'verification-command-conflict')).toHaveLength(1);
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
