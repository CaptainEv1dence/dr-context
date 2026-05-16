import { afterEach, describe, expect, test } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readWorkspace } from '../src/io/readWorkspace.js';
import { listWorkspaceFilePaths } from '../src/io/listWorkspaceFilePaths.js';
import { runScan } from '../src/core/runScan.js';
import { renderSarif } from '../src/reporting/sarifReporter.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-resource-'));
  roots.push(root);
  return root;
}

describe('resource-limited workspace reads', () => {
  test('preserves RawFile[] return shape by default', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');

    const files = await readWorkspace(root);

    expect(Array.isArray(files)).toBe(true);
    expect(files.map((file) => file.path)).toEqual(['AGENTS.md']);
  });

  test('skips context files larger than maxFileBytes without throwing', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
    await writeFile(join(root, 'README.md'), `${'x'.repeat(128)}\n`, 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 32, maxTotalBytes: 1024, maxFiles: 20 }
    });

    expect(result.files.map((file) => file.path)).toEqual(['AGENTS.md']);
    expect(result.resource.skippedFiles).toEqual([expect.objectContaining({ path: 'README.md', reason: 'file-too-large' })]);
    expect(result.resource.hitLimit).toBe(true);
  });

  test('stops reading before maxTotalBytes is exceeded', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), `${'a'.repeat(24)}\n`, 'utf8');
    await writeFile(join(root, 'README.md'), `${'r'.repeat(24)}\n`, 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 30, maxFiles: 20 }
    });

    expect(result.files.map((file) => file.path)).toEqual(['AGENTS.md']);
    expect(result.resource.skippedFiles).toEqual([expect.objectContaining({ path: 'README.md', reason: 'total-bytes-limit' })]);
  });

  test('stops reading after maxFiles and reports deterministic skipped paths', async () => {
    const root = await tempRoot();
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# Readme\n', 'utf8');
    await writeFile(join(root, 'package.json'), '{"scripts":{"test":"vitest run"}}\n', 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 4096, maxFiles: 2 }
    });

    expect(result.files).toHaveLength(2);
    expect(result.resource.skippedFiles.map((file) => file.reason)).toContain('file-count-limit');
    expect(result.resource.hitLimit).toBe(true);
  });

  test('ignores files deleted after size check but before read', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 4096, maxFiles: 20 },
      onAfterStatForTest: async (path) => {
        if (path === 'AGENTS.md') {
          await rm(join(root, 'AGENTS.md'));
        }
      }
    });

    expect(result.files).toEqual([]);
    expect(result.resource.skippedFiles).toEqual([]);
    expect(result.resource.hitLimit).toBe(false);
  });
});

describe('resource scan diagnostics', () => {
  test('reports resource diagnostics without findings, health penalty, or SARIF result', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
    await writeFile(join(root, 'README.md'), `${'x'.repeat(128)}\n`, 'utf8');

    const report = await runScan(root, {
      strict: false,
      include: [],
      exclude: [],
      resourceLimits: { maxFileBytes: 32, maxTotalBytes: 1024, maxFiles: 20 }
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('scan-resource-limit');
    expect(report.scanResource?.skippedFiles).toHaveLength(1);
    expect(report.scanResource?.hitLimit).toBe(true);
    expect(report.summary.health.score).toBe(100);
    expect(renderSarif(report)).not.toContain('scan-resource-limit');
    expect(renderSarif(report)).not.toContain('file-too-large');
  });

  test('bounds full workspace file inventory used by scoped rule checks', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await mkdir(join(root, 'src'), { recursive: true });
    for (let index = 1; index <= 20; index += 1) {
      await writeFile(join(root, 'src', `file-${index}.ts`), `export const value${index} = ${index};\n`, 'utf8');
    }

    const result = await listWorkspaceFilePaths(root, { maxFiles: 5 });

    expect(result.paths).toHaveLength(5);
    expect(result.truncated).toBe(true);
  });
});
