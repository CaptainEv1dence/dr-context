import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-live-operation-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

async function scan(files: Record<string, string>) {
  const root = await makeRepo({
    'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
    'AGENTS.md': 'Run `pnpm test` before release.',
    ...files
  });
  return runScan(root, { strict: false, include: [], exclude: [] });
}

describe('live operation policy visibility', () => {
  test('payment SDK sandbox docs without boundary emit missing-live-operation-boundary', async () => {
    const report = await scan({
      'README.md': 'This package integrates a checkout payment SDK and has sandbox examples for manual testing.'
    });

    const finding = report.findings.find((item) => item.id === 'missing-live-operation-boundary');

    expect(finding).toMatchObject({
      severity: 'info',
      confidence: 'medium',
      category: 'safety',
      primarySource: { file: 'README.md' }
    });
  });

  test('local-only default plus approval policy suppresses sensitive live-operation wording', async () => {
    const report = await scan({
      'README.md': 'This local SDK mentions payment sandbox RPC and contracts for examples.',
      'AGENTS.md': 'Default to local-only offline unit tests. Require explicit approval before live, authenticated, state-changing, payment, checkout, RPC, mainnet, testnet, production, account, secrets, or tokens actions.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-live-operation-boundary');
  });

  test('generic TypeScript contracts do not emit missing-live-operation-boundary', async () => {
    const report = await scan({
      'README.md': 'This TypeScript library documents type contracts for parser inputs and outputs.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-live-operation-boundary');
  });

  test('generic live preview wording does not emit missing-live-operation-boundary', async () => {
    const report = await scan({
      'README.md': 'Run the docs server for live preview and live reload while editing examples.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-live-operation-boundary');
  });

  test('generic API contracts do not emit missing-live-operation-boundary', async () => {
    const report = await scan({
      'README.md': 'This package documents OpenAPI contracts and service contracts for generated clients.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-live-operation-boundary');
  });
});
