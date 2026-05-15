import { describe, expect, test } from 'vitest';
import { exitCodeForReport, exitCodeForWorkspaceReport } from '../src/cli/exitCodes.js';
import { calculateHealthSummary } from '../src/core/health.js';
import type { Report, WorkspaceReport } from '../src/core/types.js';

function report(summary: Report['summary']): Report {
  return {
    schemaVersion: 'drctx.report.v1',
    tool: 'drctx',
    toolVersion: '0.1.5',
    root: '/repo',
    findings: [],
    summary
  };
}

function scanSummary(counts: { errors: number; warnings: number; infos: number; suppressed?: number }): Report['summary'] {
  return {
    ...counts,
    health: calculateHealthSummary(counts)
  };
}

describe('exitCodeForReport', () => {
  test('returns 0 when there are no error-level findings', () => {
    expect(exitCodeForReport(report(scanSummary({ errors: 0, warnings: 0, infos: 0 })), false)).toBe(0);
  });

  test('keeps clean and coverage-info reports at exit code 0', () => {
    expect(exitCodeForReport(report(scanSummary({ errors: 0, warnings: 0, infos: 0 })), false)).toBe(0);
    expect(exitCodeForReport(report(scanSummary({ errors: 0, warnings: 0, infos: 1 })), false)).toBe(0);
  });

  test('returns 1 when error-level findings exist', () => {
    expect(exitCodeForReport(report(scanSummary({ errors: 1, warnings: 0, infos: 0 })), false)).toBe(1);
  });

  test('returns 1 for warnings only in strict mode', () => {
    expect(exitCodeForReport(report(scanSummary({ errors: 0, warnings: 1, infos: 0 })), true)).toBe(1);
  });

  test('returns 0 for warnings only outside strict mode', () => {
    expect(exitCodeForReport(report(scanSummary({ errors: 0, warnings: 1, infos: 0 })), false)).toBe(0);
  });

  test('does not use scan health score for exit codes', () => {
    const lowHealthNoErrors = report({
      errors: 0,
      warnings: 0,
      infos: 0,
      health: {
        score: 0,
        grade: 'poor',
        penalties: { errors: 0, warnings: 0, infos: 0 },
        suppressedCount: 0
      }
    });

    expect(exitCodeForReport(lowHealthNoErrors, false)).toBe(0);
  });

  test('does not use workspace health score for exit codes', () => {
    const report: WorkspaceReport = {
      schemaVersion: 'drctx.workspace-report.v1',
      tool: 'drctx',
      toolVersion: '0.0.0-test',
      root: '<requested-root>',
      reports: [],
      summary: {
        roots: 0,
        errors: 0,
        warnings: 0,
        infos: 0,
        health: {
          score: 0,
          grade: 'poor',
          penalties: { errors: 0, warnings: 0, infos: 0 },
          suppressedCount: 0
        }
      }
    };

    expect(exitCodeForWorkspaceReport(report, false)).toBe(0);
  });
});
