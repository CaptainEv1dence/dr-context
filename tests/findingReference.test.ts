import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { allFindingReferenceIds, findingReferences, getFindingReference } from '../src/core/findingReference.js';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function emittedFindingIds(): string[] {
  const familyIds = new Set(['coverage-signals', 'scoped-rules']);
  const ids = new Set<string>();
  for (const file of walk('src/checks')) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/id:\s*'([^']+)'/g)) {
      if (!familyIds.has(match[1])) ids.add(match[1]);
    }
  }
  return [...ids].sort();
}

describe('finding reference catalog', () => {
  test('covers every emitted finding id and no check-family ids', () => {
    const ids = allFindingReferenceIds();

    expect(ids).toEqual(emittedFindingIds());
    expect(ids).not.toContain('coverage-signals');
    expect(ids).not.toContain('scoped-rules');
  });

  test('has complete user-facing metadata for every finding', () => {
    for (const reference of findingReferences) {
      expect(reference.id).toMatch(/^[a-z0-9-]+$/);
      expect(reference.category.length).toBeGreaterThan(20);
      expect(reference.severityPolicy.length).toBeGreaterThan(20);
      expect(reference.confidencePolicy.length).toBeGreaterThan(20);
      expect(reference.whenItFires.length).toBeGreaterThan(20);
      expect(reference.evidenceShape.length).toBeGreaterThan(20);
      expect(reference.suggestedFix.length).toBeGreaterThan(20);
      expect(reference.relatedDocs.length).toBeGreaterThan(0);
    }
  });

  test('looks up finding references by id', () => {
    expect(getFindingReference('package-manager-drift')).toMatchObject({ id: 'package-manager-drift' });
    expect(getFindingReference('coverage-signals')).toBeUndefined();
    expect(getFindingReference('unknown-finding')).toBeUndefined();
  });
});
