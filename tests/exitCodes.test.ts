import { describe, expect, test } from 'vitest';
import { exitCodeForReport } from '../src/cli/exitCodes.js';
import type { Report } from '../src/core/types.js';

function report(summary: Report['summary']): Report {
  return {
    schemaVersion: 'drctx.report.v1',
    tool: 'drctx',
    toolVersion: '0.1.3',
    root: '/repo',
    findings: [],
    summary
  };
}

describe('exitCodeForReport', () => {
  test('returns 0 when there are no error-level findings', () => {
    expect(exitCodeForReport(report({ errors: 0, warnings: 0, infos: 0 }), false)).toBe(0);
  });

  test('returns 1 when error-level findings exist', () => {
    expect(exitCodeForReport(report({ errors: 1, warnings: 0, infos: 0 }), false)).toBe(1);
  });

  test('returns 1 for warnings only in strict mode', () => {
    expect(exitCodeForReport(report({ errors: 0, warnings: 1, infos: 0 }), true)).toBe(1);
  });

  test('returns 0 for warnings only outside strict mode', () => {
    expect(exitCodeForReport(report({ errors: 0, warnings: 1, infos: 0 }), false)).toBe(0);
  });
});
