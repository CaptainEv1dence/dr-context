import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-checks-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('0.3 deterministic checks', () => {
  test('flags cross-agent command drift', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run","build":"tsc"}}',
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Run `pnpm test` and `pnpm run build`.',
      'CLAUDE.md': 'Run `npm run build`.',
      'README.md': 'Developers may also run `yarn run build` in examples.'
    });

    const report = await runScan(root, { include: [], exclude: [], strict: false });
    const findings = report.findings.filter((finding) => finding.id === 'agent-doc-command-drift');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      primarySource: { file: 'AGENTS.md', line: 1 },
      suggestion: 'Update agent instruction files to use the same package manager and verification command.'
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'agent-command', message: 'AGENTS.md:1 mentions `pnpm run build`.' }),
        expect.objectContaining({ kind: 'agent-command', message: 'CLAUDE.md:1 mentions `npm run build`.' })
      ])
    );
    expect(findings[0]?.evidence.map((evidence) => evidence.source?.file)).not.toContain('README.md');
  });

  test('does not flag command drift when agent docs agree', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run","build":"tsc"}}',
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Run `pnpm test` and `pnpm run build`.',
      'CLAUDE.md': 'Run `pnpm test` and `pnpm run build`.'
    });

    const report = await runScan(root, { include: [], exclude: [], strict: false });

    expect(report.findings.map((finding) => finding.id)).not.toContain('agent-doc-command-drift');
  });

  test('flags stale file references from agent docs', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Read docs/old-architecture.md first. Run `pnpm test`.'
    });

    const report = await runScan(root, { include: [], exclude: [], strict: false });
    const findings = report.findings.filter((finding) => finding.id === 'stale-file-reference');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      primarySource: {
        file: 'AGENTS.md',
        line: 1,
        text: 'Read docs/old-architecture.md first. Run `pnpm test`.'
      },
      suggestion: 'Update or remove the reference to docs/old-architecture.md.'
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing-local-file',
          message: 'AGENTS.md:1 references docs/old-architecture.md, but that file was not found.'
        })
      ])
    );
  });

  test('does not flag stale file references when referenced files exist', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Read ARCHITECTURE.md and docs/architecture.md first. Run `pnpm test`.',
      'ARCHITECTURE.md': '# Architecture',
      'docs/architecture.md': '# Architecture'
    });

    const report = await runScan(root, { include: [], exclude: [], strict: false });

    expect(report.findings.map((finding) => finding.id)).not.toContain('stale-file-reference');
  });

  test('does not probe outside the scan root for parent path references', async () => {
    const parentFileName = `drctx-parent-${crypto.randomUUID()}.md`;
    const parentRoot = join(tmpdir(), `drctx-parent-${crypto.randomUUID()}`);
    const root = join(parentRoot, 'repo');
    await mkdir(root, { recursive: true });
    await writeFile(join(parentRoot, parentFileName), '# Parent');
    await writeFile(join(root, 'package.json'), '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}');
    await writeFile(join(root, 'AGENTS.md'), `Read ../${parentFileName} first. Run \`pnpm test\`.`);

    const report = await runScan(root, { include: [], exclude: [], strict: false });
    const staleFinding = report.findings.find((finding) => finding.id === 'stale-file-reference');

    expect(staleFinding).toMatchObject({
      id: 'stale-file-reference',
      primarySource: { file: 'AGENTS.md', line: 1 },
      suggestion: `Update or remove the reference to ../${parentFileName}.`
    });
  });

  test('flags unsafe agent instructions but ignores negated safety guidance', async () => {
    const unsafeRoot = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Use `git commit --no-verify` and skip tests when you are in a hurry.'
    });
    const safeRoot = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Never use `git commit --no-verify`. Do not skip tests. Do not force push. Never skip tests.'
    });

    const unsafeReport = await runScan(unsafeRoot, { include: [], exclude: [], strict: false });
    const safeReport = await runScan(safeRoot, { include: [], exclude: [], strict: false });

    const findings = unsafeReport.findings.filter((finding) => finding.id === 'unsafe-agent-instructions');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      severity: 'warning',
      confidence: 'medium',
      primarySource: {
        file: 'AGENTS.md',
        line: 1,
        text: 'Use `git commit --no-verify` and skip tests when you are in a hurry.'
      },
      suggestion: 'Replace bypass guidance with explicit verification and safety expectations.'
    });
    expect(findings[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'unsafe-guidance',
          message: 'AGENTS.md:1 includes guidance that may bypass verification or safety checks.'
        })
      ])
    );
    expect(safeReport.findings.map((finding) => finding.id)).not.toContain('unsafe-agent-instructions');
  });

  test('keeps the clean fixture free of new 0.3 check findings', async () => {
    const report = await runScan(join(import.meta.dirname, 'fixtures', 'clean-repo'), {
      include: [],
      exclude: [],
      strict: false
    });

    expect(
      report.findings.filter((finding) =>
        ['agent-doc-command-drift', 'stale-file-reference', 'unsafe-agent-instructions'].includes(finding.id)
      )
    ).toHaveLength(0);
    expect(report.summary.errors).toBe(0);
  });
});
