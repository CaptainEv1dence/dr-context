import { describe, expect, test } from 'vitest';
import { renderJson } from '../src/reporting/jsonReporter.js';
import { renderText } from '../src/reporting/textReporter.js';
import type { Report } from '../src/core/types.js';

const emptyReport: Report = {
  schemaVersion: 'drctx.report.v1',
  tool: 'drctx',
  toolVersion: '0.1.2',
  root: '/repo',
  findings: [],
  summary: { errors: 0, warnings: 0, infos: 0 }
};

describe('renderJson', () => {
  test('includes schema version for tool consumers', () => {
    expect(JSON.parse(renderJson(emptyReport))).toMatchObject({
      schemaVersion: 'drctx.report.v1',
      tool: 'drctx'
    });
  });
});

describe('renderText', () => {
  test('prints no-context-rot message for empty reports', () => {
    expect(renderText(emptyReport)).toContain('No context rot found.');
  });

  test('prints finding evidence and suggestions without inferring them', () => {
    const output = renderText({
      ...emptyReport,
      findings: [
        {
          id: 'stale-package-script-reference',
          title: 'Docs reference missing package script "test:unit"',
          category: 'package-script',
          severity: 'error',
          confidence: 'high',
          primarySource: { file: 'AGENTS.md', line: 3 },
          evidence: [
            { kind: 'command-mention', message: 'AGENTS.md:3 mentions `pnpm run test:unit`.' },
            { kind: 'package-json-scripts', message: 'package.json scripts: lint, test.' }
          ],
          suggestion: 'Use `pnpm test` or add a "test:unit" script to package.json.'
        }
      ],
      summary: { errors: 1, warnings: 0, infos: 0 }
    });

    expect(output).toContain('Evidence:');
    expect(output).toContain('- AGENTS.md:3 mentions `pnpm run test:unit`.');
    expect(output).toContain('- package.json scripts: lint, test.');
    expect(output).toContain('Suggested fix:');
    expect(output).toContain('- Use `pnpm test` or add a "test:unit" script to package.json.');
  });

  test('omits optional sections when a finding has no evidence or suggestion', () => {
    const output = renderText({
      ...emptyReport,
      findings: [
        {
          id: 'minimal-finding',
          title: 'Minimal finding',
          category: 'test',
          severity: 'info',
          confidence: 'low',
          evidence: []
        }
      ],
      summary: { errors: 0, warnings: 0, infos: 1 }
    });

    expect(output).not.toContain('Evidence:');
    expect(output).not.toContain('Suggested fix:');
  });
});
