import { describe, expect, test } from 'vitest';
import { renderJson } from '../src/reporting/jsonReporter.js';
import { renderSarif } from '../src/reporting/sarifReporter.js';
import { renderText } from '../src/reporting/textReporter.js';
import { renderWorkspaceJson, renderWorkspaceText } from '../src/reporting/workspaceReporter.js';
import { calculateHealthSummary } from '../src/core/health.js';
import type { Report, WorkspaceReport } from '../src/core/types.js';

const emptyReport: Report = {
  schemaVersion: 'drctx.report.v1',
  tool: 'drctx',
  toolVersion: '0.1.5',
  root: '/repo',
  findings: [],
  summary: scanSummary({ errors: 0, warnings: 0, infos: 0 })
};

describe('renderJson', () => {
  test('includes schema version for tool consumers', () => {
    expect(JSON.parse(renderJson(emptyReport))).toMatchObject({
      schemaVersion: 'drctx.report.v1',
      tool: 'drctx'
    });
  });
});

describe('renderSarif', () => {
  test('renders a SARIF 2.1.0 report with rules and result locations', () => {
    const output = JSON.parse(
      renderSarif({
        ...emptyReport,
        findings: [
          {
            id: 'stale-package-script-reference',
            title: 'Docs reference missing package script "test:unit"',
            category: 'package-script',
            severity: 'error',
            confidence: 'high',
            primarySource: { file: 'AGENTS.md', line: 3, column: 5 },
            evidence: [
              { kind: 'command-mention', message: 'AGENTS.md:3 mentions `pnpm run test:unit`.' },
              { kind: 'package-json-scripts', message: 'package.json scripts: lint, test.' }
            ],
            suggestion: 'Use `pnpm test` or add a "test:unit" script to package.json.'
          }
        ],
        summary: scanSummary({ errors: 1, warnings: 0, infos: 0 })
      })
    );

    expect(output).toMatchObject({
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Dr. Context',
              semanticVersion: '0.1.5',
              rules: [
                {
                  id: 'stale-package-script-reference',
                  defaultConfiguration: { level: 'error' },
                  properties: { precision: 'high', 'problem.severity': 'error' }
                }
              ]
            }
          },
          results: [
            {
              ruleId: 'stale-package-script-reference',
              ruleIndex: 0,
              level: 'error',
              message: { text: 'Docs reference missing package script "test:unit"' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'AGENTS.md' },
                    region: { startLine: 3, startColumn: 5 }
                  }
                }
              ]
            }
          ]
        }
      ]
    });
    expect(output.runs[0].results[0].message.markdown).toContain('Suggested fix');
    expect(output.runs[0].results[0].partialFingerprints.primaryLocationLineHash).toContain(
      'stale-package-script-reference:AGENTS.md:3'
    );
  });

  test('renders a valid empty SARIF report', () => {
    const output = JSON.parse(renderSarif(emptyReport));

    expect(output.runs[0].tool.driver.rules).toEqual([]);
    expect(output.runs[0].results).toEqual([]);
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
      summary: scanSummary({ errors: 1, warnings: 0, infos: 0 })
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
      summary: scanSummary({ errors: 0, warnings: 0, infos: 1 })
    });

    expect(output).not.toContain('Evidence:');
    expect(output).not.toContain('Suggested fix:');
  });
});

describe('workspace reporters', () => {
  test('renders redacted workspace JSON aggregates', () => {
    const output = JSON.parse(
      renderWorkspaceJson({
        schemaVersion: 'drctx.workspace-report.v1',
        tool: 'drctx',
        toolVersion: '0.2.0',
        root: '<requested-root>',
        reports: [{ path: 'repo-a', report: emptyReport }],
        summary: workspaceSummary({ roots: 1, errors: 0, warnings: 0, infos: 0 })
      })
    );

    expect(output).toMatchObject({
      schemaVersion: 'drctx.workspace-report.v1',
      root: '<requested-root>',
      reports: [{ path: 'repo-a', report: { root: '<candidate-root>' } }]
    });
  });

  test('renders workspace text aggregates', () => {
    const output = renderWorkspaceText({
      schemaVersion: 'drctx.workspace-report.v1',
      tool: 'drctx',
      toolVersion: '0.2.0',
      root: '<requested-root>',
      reports: [{ path: 'repo-a', report: { ...emptyReport, summary: scanSummary({ errors: 0, warnings: 1, infos: 0 }) } }],
      summary: workspaceSummary({ roots: 1, errors: 0, warnings: 1, infos: 0 })
    });

    expect(output).toContain('Dr. Context Workspace');
    expect(output).toContain('repo-a: 0 error(s), 1 warning(s), 0 info(s)');
  });

  test('prints a truncation notice when workspace text findings are limited', () => {
    const output = renderWorkspaceText(
      {
        schemaVersion: 'drctx.workspace-report.v1',
        tool: 'drctx',
        toolVersion: '0.3.0',
        root: '<requested-root>',
        reports: [
          {
            path: 'repo-a',
            report: {
              ...emptyReport,
              findings: [
                {
                  id: 'first-finding',
                  title: 'First finding',
                  category: 'test',
                  severity: 'warning',
                  confidence: 'high',
                  evidence: []
                },
                {
                  id: 'second-finding',
                  title: 'Second finding',
                  category: 'test',
                  severity: 'warning',
                  confidence: 'high',
                  evidence: []
                }
              ],
              summary: scanSummary({ errors: 0, warnings: 2, infos: 0 })
            }
          }
        ],
        summary: workspaceSummary({ roots: 1, errors: 0, warnings: 2, infos: 0 })
      },
      { maxFindings: 1 }
    );

    expect(output).toContain('first-finding');
    expect(output).not.toContain('second-finding');
    expect(output).toContain('1 finding(s) omitted by --max-findings=1.');
  });

  test('workspace summary-only text omits per-root finding details', () => {
    const output = renderWorkspaceText(
      {
        schemaVersion: 'drctx.workspace-report.v1',
        tool: 'drctx',
        toolVersion: '0.3.0',
        root: '<requested-root>',
        reports: [{ path: 'repo-a', report: { ...emptyReport, summary: scanSummary({ errors: 0, warnings: 1, infos: 0 }) } }],
        summary: workspaceSummary({ roots: 1, errors: 0, warnings: 1, infos: 0 })
      },
      { summaryOnly: true }
    );

    expect(output).toContain('Totals: 0 error(s), 1 warning(s), 0 info(s).');
    expect(output).not.toContain('repo-a:');
  });
});

function scanSummary(counts: { errors: number; warnings: number; infos: number; suppressed?: number }): Report['summary'] {
  return {
    ...counts,
    health: calculateHealthSummary(counts)
  };
}

function workspaceSummary(
  counts: { roots: number; errors: number; warnings: number; infos: number; suppressed?: number }
): WorkspaceReport['summary'] {
  return {
    ...counts,
    health: calculateHealthSummary(counts)
  };
}
