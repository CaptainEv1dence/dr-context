import { describe, expect, test } from 'vitest';
import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runScan } from '../src/core/runScan.js';
import { fixtureRoot } from './helpers.js';

type DogfoodExpected = {
  schemaVersion: 'drctx.dogfood-case.v1';
  case: string;
  description: string;
  before: ExpectedScan;
  after?: ExpectedScan;
};

type ExpectedScan = {
  root: string;
  findingIds: string[];
};

const corpusRoot = fixtureRoot('dogfood-corpus');

async function readExpected(caseName: string): Promise<DogfoodExpected> {
  return JSON.parse(await readFile(join(corpusRoot, caseName, 'drctx.expected.json'), 'utf8')) as DogfoodExpected;
}

async function caseNames(): Promise<string[]> {
  const entries = await readdir(corpusRoot, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const caseDirectories = await Promise.all(
    directories.map(async (name) => {
      try {
        await access(join(corpusRoot, name, 'drctx.expected.json'));
        return name;
      } catch {
        return undefined;
      }
    })
  );
  return caseDirectories.filter((name): name is string => name !== undefined).sort();
}

async function scanFindingIds(caseName: string, expected: ExpectedScan): Promise<string[]> {
  const report = await runScan(join(corpusRoot, caseName, expected.root), {
    strict: false,
    include: [],
    exclude: []
  });
  return report.findings.map((finding) => finding.id).sort();
}

describe('synthetic dogfood corpus', () => {
  test('every corpus case matches expected finding IDs', async () => {
    const names = await caseNames();

    expect(names).toContain('clean-context');
    expect(names).toContain('no-agent-instructions');

    for (const name of names) {
      const expected = await readExpected(name);
      expect(expected.schemaVersion).toBe('drctx.dogfood-case.v1');
      expect(await scanFindingIds(name, expected.before)).toEqual([...expected.before.findingIds].sort());
      if (expected.after) {
        expect(await scanFindingIds(name, expected.after)).toEqual([...expected.after.findingIds].sort());
      }
    }
  });
});
