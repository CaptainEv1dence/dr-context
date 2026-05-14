import { mkdir, writeFile } from 'node:fs/promises';
import path, { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { runCli } from '../src/cli/main.js';
import { buildManifest } from '../src/core/buildManifest.js';
import { normalizeRootContainedPath, normalizeRootContainedPathWith } from '../src/core/pathGuards.js';
import { renderManifestJson } from '../src/reporting/manifestReporter.js';
import { fixtureRoot } from './helpers.js';

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-manifest-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('buildManifest', () => {
  test('builds a canonical context contract from repo facts', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run","typecheck":"tsc --noEmit"}}',
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'AGENTS.md': 'Read ARCHITECTURE.md first. Run `pnpm test` and `pnpm run typecheck`.',
      'ARCHITECTURE.md': '# Architecture',
      '.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: pnpm test\n      - run: pnpm run typecheck\n'
    });

    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });

    expect(manifest).toMatchObject({
      schemaVersion: 'drctx.manifest.v1',
      tool: 'drctx',
      root,
      packageManager: { name: 'pnpm', version: '11.1.1' },
      summary: {
        agentInstructionFiles: 1,
        verificationCommands: 2,
        ciCommands: 2,
        firstReads: 1
      }
    });
    expect(manifest.verificationCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: 'pnpm test', ciBacked: true, agentVisible: true }),
        expect.objectContaining({ command: 'pnpm run typecheck', ciBacked: true, agentVisible: true })
      ])
    );
    expect(manifest.firstReads).toEqual([
      expect.objectContaining({ path: 'ARCHITECTURE.md', exists: true, agentVisible: true })
    ]);
  });

  test('includes instruction surface metadata in manifest entries', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      '.github/copilot-instructions.md': 'Run `pnpm test`.',
      '.cursor/rules/frontend.mdc': '---\ndescription: Frontend rule\n---\nUse React.',
      'GEMINI.md': '# Gemini\nRun `pnpm test`.'
    });

    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });

    expect(manifest.agentInstructionFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '.github/copilot-instructions.md', type: 'copilot', scope: 'repo' }),
        expect.objectContaining({ path: '.cursor/rules/frontend.mdc', type: 'cursor', scope: 'nested' }),
        expect.objectContaining({ path: 'GEMINI.md', type: 'gemini', scope: 'repo' })
      ])
    );
  });

  test('includes missing first-read references from agent docs', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Read ARCHITECTURE.md first. Run `pnpm test`.'
    });

    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });

    expect(manifest.firstReads).toEqual([
      expect.objectContaining({
        path: 'ARCHITECTURE.md',
        exists: false,
        agentVisible: true,
        source: {
          file: 'AGENTS.md',
          line: 1,
          text: 'Read ARCHITECTURE.md first. Run `pnpm test`.'
        }
      })
    ]);
  });

  test('recognizes corepack package-script commands as CI-backed', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"pack:dry-run":"pnpm pack --dry-run"}}',
      'AGENTS.md': 'Run `pnpm run pack:dry-run`.',
      '.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: corepack pnpm run pack:dry-run\n'
    });

    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });

    expect(manifest.verificationCommands).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: 'pnpm run pack:dry-run', ciBacked: true })])
    );
  });

  test('builds path-scoped effective instruction manifest', async () => {
    const manifest = await buildManifest(fixtureRoot('scoped-context'), {
      strict: false,
      include: [],
      exclude: [],
      targetPath: 'backend/src/api.ts'
    });

    expect(manifest.targetPath).toBe('backend/src/api.ts');
    expect(manifest.effectiveInstructionFiles?.map((entry) => entry.path)).toEqual([
      'AGENTS.md',
      'backend/AGENTS.md',
      '.cursor/rules/backend.mdc'
    ]);
    expect(manifest.summary.effectiveInstructionFiles).toBe(3);
  });

  test('builds path-scoped manifest for directory targets', async () => {
    const manifest = await buildManifest(fixtureRoot('scoped-context'), {
      strict: false,
      include: [],
      exclude: [],
      targetPath: 'backend'
    });

    expect(manifest.targetPath).toBe('backend');
    expect(manifest.effectiveInstructionFiles?.map((entry) => entry.path)).toEqual([
      'AGENTS.md',
      'backend/AGENTS.md'
    ]);
  });

  test('plain manifest JSON keeps compatibility shape without path fields', async () => {
    const manifest = await buildManifest(fixtureRoot('scoped-context'), { include: [], exclude: [], strict: false });
    const output = JSON.parse(renderManifestJson(manifest));

    expect(output).not.toHaveProperty('targetPath');
    expect(output).not.toHaveProperty('effectiveInstructionFiles');
    expect(output.summary).not.toHaveProperty('effectiveInstructionFiles');
  });

  test('does not treat CI shell plumbing as canonical verification context', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Run `pnpm test`.',
      '.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: |\n          pnpm test\n          if [ "$?" -ne 0 ]; then\n            echo "failed"\n            exit 1\n          fi\n'
    });

    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });

    expect(manifest.verificationCommands).toEqual([
      expect.objectContaining({ command: 'pnpm test', ciBacked: true, agentVisible: true })
    ]);
    expect(manifest.ciCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ command: 'if [ "$?" -ne 0 ]; then', classification: 'shell-control' }),
        expect.objectContaining({ command: 'echo "failed"', classification: 'output-plumbing' }),
        expect.objectContaining({ command: 'exit 1', classification: 'shell-control' }),
        expect.objectContaining({ command: 'fi', classification: 'shell-control' })
      ])
    );
  });

  test('redacts roots in JSON output', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"npm@10.0.0","scripts":{"test":"vitest run"}}',
      'AGENTS.md': 'Run `npm test`.'
    });
    const manifest = await buildManifest(root, { include: [], exclude: [], strict: false });
    const output = JSON.parse(renderManifestJson(manifest));

    expect(output.root).toBe('<requested-root>');
    expect(JSON.stringify(output)).not.toContain(root);
  });

  test('prints manifest text reports by default', async () => {
    const root = await makeRepo({
      'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
      '.github/copilot-instructions.md': 'Run `pnpm test`.'
    });
    const result = await runCli(['node', 'drctx', 'manifest', '--root', root]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Dr. Context Manifest');
    expect(result.stdout).toContain('Package manager: pnpm');
    expect(result.stdout).toContain('All instruction inventory:');
    expect(result.stdout).toContain('- .github/copilot-instructions.md (copilot, repo)');
    expect(result.stdout).toContain('- pnpm test (ciBacked=');
  });

  test('prints separate effective instruction section in text manifest', async () => {
    const result = await runCli(['node', 'drctx', 'manifest', '--root', fixtureRoot('scoped-context'), '--path', 'backend/src/api.ts']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('All instruction inventory:');
    expect(result.stdout).toContain('Effective instruction files for backend/src/api.ts:');
    expect(result.stdout).toContain('- backend/AGENTS.md (agents, nested) - target path is under backend/');
    expect(result.stdout).toContain('Verification commands:');
    expect(result.stdout).not.toContain('—');
  });
});

describe('normalizeRootContainedPath', () => {
  test('normalizes relative path syntax to root-relative slash path', () => {
    expect(normalizeRootContainedPath('/repo', './backend\\src\\api.ts')).toBe('backend/src/api.ts');
  });

  test('accepts absolute paths inside root', () => {
    const root = resolve('/repo');
    const target = resolve(root, 'backend/src/api.ts');

    expect(normalizeRootContainedPath(root, target)).toBe('backend/src/api.ts');
  });

  test('rejects relative escapes outside root', () => {
    expect(() => normalizeRootContainedPath('/repo', '../outside.ts')).toThrow('--path must stay inside --root');
  });

  test('rejects absolute paths outside root', () => {
    expect(() => normalizeRootContainedPath('/repo', '/outside.ts')).toThrow('--path must stay inside --root');
  });

  test('rejects Windows cross-drive absolute paths', () => {
    expect(() => normalizeRootContainedPathWith(path.win32, 'C:\\repo', 'D:\\outside.ts')).toThrow('--path must stay inside --root');
  });
});
