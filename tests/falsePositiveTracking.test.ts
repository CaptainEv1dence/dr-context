import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixtureRoot } from './helpers.js';

type Ledger = {
  schemaVersion: 'drctx.false-positive-ledger.v1';
  entries: Array<{
    case: string;
    findingId: string;
    status: 'accepted' | 'false-positive' | 'fixed';
    reason: string;
    nextReview?: string;
  }>;
};

const expectedStatuses = new Set(['accepted', 'false-positive', 'fixed']);
const privatePathMarkers = [/\b[A-Z]:[\\/]/, /\\Users\\/i, /\/Users\//i, /\\home\\/i, /\/home\//i, /\\repos?\\/i, /\/repos?\//i];

describe('false-positive tracking fixture', () => {
  test('documents accepted, false-positive, and fixed finding categories without private paths', async () => {
    const ledger = JSON.parse(
      await readFile(join(fixtureRoot('dogfood-corpus'), 'false-positive-ledger', 'false-positives.json'), 'utf8')
    ) as Ledger;

    expect(ledger.schemaVersion).toBe('drctx.false-positive-ledger.v1');
    expect(new Set(ledger.entries.map((entry) => entry.status))).toEqual(expectedStatuses);

    for (const entry of ledger.entries) {
      expect(entry.reason.trim().length).toBeGreaterThan(20);
      expect(entry.reason).toMatch(/[a-z]{4,}/i);

      const entryText = JSON.stringify(entry);
      for (const marker of privatePathMarkers) {
        expect(entryText).not.toMatch(marker);
      }
    }
  });
});
