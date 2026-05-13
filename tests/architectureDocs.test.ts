import { describe, expect, test } from 'vitest';
import { extractArchitectureDocs } from '../src/extractors/architectureDocs.js';

describe('extractArchitectureDocs', () => {
  test('detects architecture docs with source evidence', () => {
    expect(
      extractArchitectureDocs([
        { path: 'ARCHITECTURE.md', content: '# Architecture\n' },
        { path: 'docs/adr/0001-example.md', content: '# Use deterministic checks\n' }
      ])
    ).toEqual([
      {
        path: 'ARCHITECTURE.md',
        kind: 'architecture',
        source: { file: 'ARCHITECTURE.md', line: 1, text: '# Architecture' }
      },
      {
        path: 'docs/adr/0001-example.md',
        kind: 'adr',
        source: { file: 'docs/adr/0001-example.md', line: 1, text: '# Use deterministic checks' }
      }
    ]);
  });
});
