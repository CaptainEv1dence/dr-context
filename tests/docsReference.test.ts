import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { instructionSurfaceGlobs } from '../src/extractors/instructionSurfaces.js';

describe('docs references', () => {
  test('documents every registered instruction-surface glob', () => {
    const doc = readFileSync('docs/instruction-surface-coverage.md', 'utf8');

    expect(instructionSurfaceGlobs.length).toBeGreaterThan(0);
    expect(instructionSurfaceGlobs.filter((glob) => !doc.includes(glob))).toEqual([]);
  });

  test('keeps README linked to launch adoption docs', () => {
    const readme = readFileSync('README.md', 'utf8');

    for (const path of [
      'docs/demo.md',
      'docs/triage-findings.md',
      'docs/github-action.md',
      'docs/finding-reference.md',
      'docs/instruction-surface-coverage.md',
      'docs/false-positive-tracking.md'
    ]) {
      expect(readme).toContain(path);
    }
  });
});
