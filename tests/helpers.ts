import { join } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const tempRoots: string[] = [];

export function fixtureRoot(name: string): string {
  return join(import.meta.dirname, 'fixtures', name);
}

export async function tempFixture(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-fixture-${crypto.randomUUID()}`);
  tempRoots.push(root);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

export async function cleanupTempFixtures(): Promise<void> {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
}
