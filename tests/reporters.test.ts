import { describe, expect, test } from 'vitest';
import { renderJson } from '../src/reporting/jsonReporter.js';
import { renderSarif } from '../src/reporting/sarifReporter.js';
import { renderText } from '../src/reporting/textReporter.js';
import type { Report } from '../src/core/types.js';

const emptyReport: Report = {
  schemaVersion: 'drctx.report.v1',
  tool: 'drctx',
  toolVersion: '0.1.5',
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
        summary: { errors: 1, warnings: 0, infos: 0 }
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
