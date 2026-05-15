import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { runChecks } from '../src/core/checks.js';
import { runScan } from '../src/core/runScan.js';
import type { CheckContext, RepoFacts } from '../src/core/types.js';

const baseFiles = {
  'package.json': '{"packageManager":"pnpm@11.1.1","scripts":{"test":"vitest run"}}',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
  'AGENTS.md': 'Use TypeScript. Run `pnpm test`.'
};

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-policy-visibility-${crypto.randomUUID()}`);
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

async function scan(files: Record<string, string>) {
  const root = await makeRepo({ ...baseFiles, ...files });
  return runScan(root, { strict: false, include: [], exclude: [] });
}

function policyContext(overrides: Partial<RepoFacts>): CheckContext {
  return {
    facts: {
      root: '/repo',
      packageManagers: [],
      scripts: [],
      buildTargets: [],
      runtimeVersions: [],
      commandMentions: [],
      ciCommands: [],
      workflowPrompts: [],
      architectureDocs: [],
      agentInstructionDocs: [],
      inheritedAgentInstructionDocs: [],
      localPathMentions: [],
      files: [],
      filePaths: [],
      keyDirectories: [],
      ...overrides
    },
    config: { strict: false, include: [], exclude: [] }
  };
}

describe('policy visibility checks', () => {
  test('strong canonical secret policy with missing agent docs emits hidden-secret-hygiene-policy', async () => {
    const report = await scan({
      'SECURITY.md': 'Never commit secrets, tokens, credentials, or .env files.'
    });

    const finding = report.findings.find((item) => item.id === 'hidden-secret-hygiene-policy');
    expect(finding).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      primarySource: { file: 'SECURITY.md' },
      suggestion: expect.stringContaining('agent-visible')
    });
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'canonical-secret-policy', source: expect.objectContaining({ file: 'SECURITY.md' }) })
      ])
    );
  });

  test('agent-visible secret guidance suppresses hidden-secret-hygiene-policy', async () => {
    const report = await scan({
      'SECURITY.md': 'Never commit secrets, tokens, credentials, or .env files.',
      'AGENTS.md': 'Never commit secrets or .env files. Run `pnpm test`.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('workflow prompt secret guidance suppresses hidden-secret-hygiene-policy', async () => {
    const report = await scan({
      'SECURITY.md': 'Never commit secrets, tokens, credentials, or .env files.',
      '.github/workflows/agent.yml': 'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Never commit secrets or .env files.\n'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('inherited agent secret guidance suppresses hidden-secret-hygiene-policy', () => {
    const findings = runChecks(
      policyContext({
        files: [{ path: 'SECURITY.md', content: 'Never commit secrets, tokens, credentials, or .env files.' }],
        inheritedAgentInstructionDocs: [
          {
            path: 'AGENTS.md',
            content: 'Never commit secrets or .env files.',
            tool: 'agents',
            scope: 'repo',
            inherited: true,
            source: { file: 'AGENTS.md', line: 1 }
          }
        ]
      })
    );

    expect(findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('no canonical policy source does not emit hidden-secret-hygiene-policy', async () => {
    const report = await scan({});

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('weak generic secure alone does not emit hidden-secret-hygiene-policy', async () => {
    const report = await scan({
      'SECURITY.md': 'Keep the project secure.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('README API_TOKEN setup mention does not emit hidden-secret-hygiene-policy', async () => {
    const report = await scan({
      'README.md': 'Set API_TOKEN in your shell before calling the example API.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-secret-hygiene-policy');
  });

  test('explicit destructive policy with missing agent docs emits hidden-destructive-action-policy', async () => {
    const report = await scan({
      'CONTRIBUTING.md': 'Do not force push, run git reset --hard, rm -rf files, or drop table data without approval.'
    });

    const finding = report.findings.find((item) => item.id === 'hidden-destructive-action-policy');
    expect(finding).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      primarySource: { file: 'CONTRIBUTING.md' }
    });
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'canonical-destructive-action-policy', source: expect.objectContaining({ file: 'CONTRIBUTING.md' }) })
      ])
    );
  });

  test('agent-visible destructive boundary suppresses hidden-destructive-action-policy', async () => {
    const report = await scan({
      'CONTRIBUTING.md': 'Do not force push, run git reset --hard, rm -rf files, or drop table data without approval.',
      'AGENTS.md': 'Never use destructive commands like force push or reset --hard without approval.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('workflow prompt destructive boundary suppresses hidden-destructive-action-policy', async () => {
    const report = await scan({
      'CONTRIBUTING.md': 'Do not force push, run git reset --hard, rm -rf files, or drop table data without approval.',
      '.github/workflows/agent.yml': 'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Never use destructive commands like force push or reset --hard without approval.\n'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('weak generic caution does not emit hidden-destructive-action-policy', async () => {
    const report = await scan({
      'CONTRIBUTING.md': 'Be careful and use caution when changing files.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('README production deploy mention does not emit hidden-destructive-action-policy', async () => {
    const report = await scan({
      'README.md': 'Deploy to production with your normal release process.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('arbitrary docs file with explicit destructive policy is not a canonical policy source', async () => {
    const report = await scan({
      'docs/operations.md': 'Do not force push or run reset --hard without maintainer approval.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('already-read ADR with explicit destructive policy emits hidden-destructive-action-policy', async () => {
    const report = await scan({
      'docs/adr/0002-release-safety.md': 'Do not force push or run reset --hard without maintainer approval.'
    });

    const finding = report.findings.find((item) => item.id === 'hidden-destructive-action-policy');
    expect(finding).toMatchObject({
      severity: 'warning',
      confidence: 'high',
      primarySource: { file: 'docs/adr/0002-release-safety.md' }
    });
  });

  test('already-read arbitrary docs file with explicit destructive policy is not a canonical policy source', () => {
    const findings = runChecks(
      policyContext({
        files: [{ path: 'docs/operations.md', content: 'Do not force push or run reset --hard without maintainer approval.' }]
      })
    );

    expect(findings.map((finding) => finding.id)).not.toContain('hidden-destructive-action-policy');
  });

  test('package metadata generated output with missing agent docs emits missing-generated-file-boundary', async () => {
    const report = await scan({
      'package.json': JSON.stringify({
        packageManager: 'pnpm@11.1.1',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        files: ['dist/**/*'],
        scripts: { test: 'vitest run', build: 'tsc -p tsconfig.json' }
      })
    });

    const finding = report.findings.find((item) => item.id === 'missing-generated-file-boundary');
    expect(finding).toMatchObject({
      severity: 'info',
      confidence: 'high',
      primarySource: { file: 'package.json' }
    });
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'generated-artifact-metadata', source: expect.objectContaining({ file: 'package.json' }) })
      ])
    );
  });

  test('agent-visible generated boundary suppresses missing-generated-file-boundary', async () => {
    const report = await scan({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', main: './dist/index.js', scripts: { test: 'vitest run' } }),
      'AGENTS.md': 'Do not edit generated dist files directly. Run `pnpm test`.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-generated-file-boundary');
  });

  test('workflow prompt generated boundary suppresses missing-generated-file-boundary', async () => {
    const report = await scan({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', main: './dist/index.js', scripts: { test: 'vitest run' } }),
      '.github/workflows/agent.yml': 'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Do not edit generated dist files directly.\n'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-generated-file-boundary');
  });

  test('string-form package bin generated output with missing agent docs emits missing-generated-file-boundary', async () => {
    const report = await scan({
      'package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', bin: 'dist/cli.js', scripts: { test: 'vitest run' } })
    });

    const finding = report.findings.find((item) => item.id === 'missing-generated-file-boundary');
    expect(finding).toMatchObject({
      severity: 'info',
      confidence: 'high',
      primarySource: { file: 'package.json' }
    });
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'generated-artifact-metadata',
          message: 'package.json bin points to generated output.',
          source: expect.objectContaining({ file: 'package.json' })
        })
      ])
    );
  });

  test('ignored dist output alone does not emit missing-generated-file-boundary', async () => {
    const report = await scan({
      'dist/index.js': 'console.log("generated");'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('missing-generated-file-boundary');
  });

  test('canonical workflow policy with missing agent docs emits hidden-workflow-policy', async () => {
    const report = await scan({
      '.github/pull_request_template.md': 'Use TDD, run tests before committing, request review before merge, and verify changes before release.'
    });

    const finding = report.findings.find((item) => item.id === 'hidden-workflow-policy');
    expect(finding).toMatchObject({
      severity: 'info',
      confidence: 'high',
      primarySource: { file: '.github/pull_request_template.md' }
    });
    expect(finding?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'canonical-workflow-policy', source: expect.objectContaining({ file: '.github/pull_request_template.md' }) })
      ])
    );
  });

  test('agent-visible workflow guidance suppresses hidden-workflow-policy', async () => {
    const report = await scan({
      '.github/pull_request_template.md': 'Use TDD, run tests before committing, request review before merge, and verify changes before release.',
      'AGENTS.md': 'Use TDD and run tests before committing. Request review before merge.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-workflow-policy');
  });

  test('workflow prompt workflow guidance suppresses hidden-workflow-policy', async () => {
    const report = await scan({
      '.github/pull_request_template.md': 'Use TDD, run tests before committing, request review before merge, and verify changes before release.',
      '.github/workflows/agent.yml': 'jobs:\n  agent:\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          direct_prompt: Use TDD and run tests before committing. Request review before merge.\n'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-workflow-policy');
  });

  test('generic docs process wording does not emit hidden-workflow-policy', async () => {
    const report = await scan({
      'CONTRIBUTING.md': 'Document your process and keep project docs updated.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-workflow-policy');
  });

  test('docs TDD comparison mention does not emit hidden-workflow-policy', async () => {
    const report = await scan({
      'docs/CONTRIBUTING.md': 'This document compares TDD, BDD, and exploratory testing styles.'
    });

    expect(report.findings.map((finding) => finding.id)).not.toContain('hidden-workflow-policy');
  });
});
