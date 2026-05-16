import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import fg from 'fast-glob';
import type { RawFile } from '../core/types.js';
import { getInstructionSurfaceForPath, instructionSurfaceGlobs } from '../extractors/instructionSurfaces.js';

export async function readInitInputs(root: string): Promise<RawFile[]> {
  const files: RawFile[] = [];

  if (await exists(join(root, '.drctx.json'))) {
    files.push({ path: '.drctx.json', content: '' });
  }

  const paths = await fg(instructionSurfaceGlobs, {
    cwd: root,
    onlyFiles: true,
    dot: true,
    unique: true,
    ignore: ['**/node_modules/**', '**/.git/**']
  });

  for (const path of paths.sort()) {
    const normalized = path.replace(/\\/g, '/');
    if (!getInstructionSurfaceForPath(normalized)) {
      continue;
    }
    files.push({ path: normalized, content: await readFile(join(root, normalized), 'utf8') });
  }

  return dedupeByPath(files);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function dedupeByPath(files: RawFile[]): RawFile[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = file.path.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
