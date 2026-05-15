import { describe, expect, test } from 'vitest';
import { calculateHealthSummary, healthSummaryFromReports } from '../src/core/health.js';
import type { Report } from '../src/core/types.js';

describe('context health summary', () => {
  test('scores clean context as excellent', () => {
    expect(calculateHealthSummary({ errors: 0, warnings: 0, infos: 0, suppressed: 0 })).toEqual({
      score: 100,
      grade: 'excellent',
      penalties: { errors: 0, warnings: 0, infos: 0 },
      suppressedCount: 0
    });
  });

  test('applies deterministic severity penalties and clamps at zero', () => {
    expect(calculateHealthSummary({ errors: 1, warnings: 2, infos: 3, suppressed: 4 })).toEqual({
      score: 39,
      grade: 'poor',
      penalties: { errors: 35, warnings: 20, infos: 6 },
      suppressedCount: 4
    });

    expect(calculateHealthSummary({ errors: 4, warnings: 0, infos: 0, suppressed: 0 }).score).toBe(0);
  });

  test('uses stable grade thresholds', () => {
    expect(calculateHealthSummary({ errors: 0, warnings: 0, infos: 2, suppressed: 0 }).grade).toBe('excellent');
    expect(calculateHealthSummary({ errors: 0, warnings: 2, infos: 0, suppressed: 0 }).grade).toBe('good');
    expect(calculateHealthSummary({ errors: 1, warnings: 0, infos: 0, suppressed: 0 }).grade).toBe('fair');
    expect(calculateHealthSummary({ errors: 1, warnings: 1, infos: 0, suppressed: 0 }).grade).toBe('poor');
  });

  test('aggregates workspace health from visible child summaries', () => {
    const reports = [
      reportWithCounts({ errors: 0, warnings: 1, infos: 0, suppressed: 2 }),
      reportWithCounts({ errors: 1, warnings: 0, infos: 2, suppressed: 1 })
    ];

    expect(healthSummaryFromReports(reports)).toEqual({
      score: 51,
      grade: 'poor',
      penalties: { errors: 35, warnings: 10, infos: 4 },
      suppressedCount: 3
    });
  });
});

function reportWithCounts(counts: { errors: number; warnings: number; infos: number; suppressed?: number }): Report {
  return {
    schemaVersion: 'drctx.report.v1',
    tool: 'drctx',
    toolVersion: '0.0.0-test',
    root: '<test-root>',
    findings: [],
    summary: {
      ...counts,
      health: calculateHealthSummary(counts)
    }
  };
}
