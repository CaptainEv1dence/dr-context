#!/usr/bin/env node
import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigUsageError, loadConfig } from '../config/loadConfig.js';
import type { BaselineFile } from '../config/types.js';
import { allFindingReferenceIds, getFindingReference } from '../core/findingReference.js';
import { applySuppressions, fingerprintFinding, withSuppressionResult } from '../core/suppressions.js';
import { runScan } from '../core/runScan.js';
import { buildManifest } from '../core/buildManifest.js';
import { normalizeRootContainedPath, UsagePathError } from '../core/pathGuards.js';
import { runWorkspaceScan } from '../core/workspaceScan.js';
import { discoverCandidates } from '../discovery/discoverCandidates.js';
import { renderDiscoverJson } from '../reporting/discoverJsonReporter.js';
import { renderDiscoverText } from '../reporting/discoverTextReporter.js';
import { renderJson } from '../reporting/jsonReporter.js';
import { renderManifestJson, renderManifestText } from '../reporting/manifestReporter.js';
import { renderSarif } from '../reporting/sarifReporter.js';
import { renderText } from '../reporting/textReporter.js';
import { renderWorkspaceJson, renderWorkspaceText } from '../reporting/workspaceReporter.js';
import { toolVersion } from '../version.js';
import { exitCodeForReport, exitCodeForWorkspaceReport } from './exitCodes.js';

type CliOptions = {
  json?: boolean;
  sarif?: boolean;
  strict?: boolean;
  workspace?: boolean;
  include: string[];
  exclude: string[];
  root?: string;
  maxDepth?: string;
  maxFindings?: string;
  summaryOnly?: boolean;
  path?: string;
  inheritParentInstructions?: boolean;
  config?: string;
  showSuppressed?: boolean;
};
type DiscoverCliOptions = { json?: boolean; root?: string; maxDepth?: string };
type BaselineCliOptions = { root?: string; output: string };
type ExplainCliOptions = { json?: boolean; list?: boolean };

export type CliResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

class UsageError extends Error {}

export async function runCli(argv: string[]): Promise<CliResult> {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  const program = createProgram(
    commandNameFromArgv(argv),
    async (options, parentOptions) => {
      try {
        const effectiveOptions = { ...parentOptions, ...options };
        const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
        const loadedConfig = await loadConfig(root, { configPath: effectiveOptions.config });
        const scanConfig = {
          strict: Boolean(effectiveOptions.strict ?? loadedConfig.strict),
          include: [...(loadedConfig.include ?? []), ...(effectiveOptions.include ?? [])],
          exclude: [...(loadedConfig.exclude ?? []), ...(effectiveOptions.exclude ?? [])]
        };
        if (effectiveOptions.inheritParentInstructions && !effectiveOptions.workspace) {
          throw usageError('--inherit-parent-instructions requires --workspace');
        }
        if (effectiveOptions.workspace) {
          const maxDepth = parseMaxDepth(effectiveOptions.maxDepth);
          const report = await runWorkspaceScan(root, {
            strict: scanConfig.strict,
            include: scanConfig.include,
            exclude: scanConfig.exclude,
            suppressions: loadedConfig.suppressions,
            workspaceBaselineSuppressions: workspaceBaselineSuppressionsFromConfig(loadedConfig),
            maxDepth,
            inheritParentInstructions: Boolean(effectiveOptions.inheritParentInstructions)
          });

          stdout += effectiveOptions.json
            ? renderWorkspaceJson(report, { showSuppressed: Boolean(effectiveOptions.showSuppressed) })
            : renderWorkspaceText(report, {
                summaryOnly: Boolean(effectiveOptions.summaryOnly),
                maxFindings: parseOptionalNonNegativeInteger(effectiveOptions.maxFindings, '--max-findings'),
                showSuppressed: Boolean(effectiveOptions.showSuppressed)
              });
          exitCode = exitCodeForWorkspaceReport(report, scanConfig.strict);
          return;
        }

        const report = await runScan(root, {
          strict: scanConfig.strict,
          include: scanConfig.include,
          exclude: scanConfig.exclude
        });
        const suppressions = [...loadedConfig.suppressions, ...baselineSuppressionsFromConfig(loadedConfig)];
        const finalReport = withSuppressionResult(report, applySuppressions(report.findings, suppressions));

        stdout += renderScanReport(finalReport, effectiveOptions);
        exitCode = exitCodeForReport(finalReport, scanConfig.strict);
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    },
    async (options, parentOptions) => {
      try {
        const effectiveOptions = { ...parentOptions, ...options };
        const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
        const maxDepth = parseMaxDepth(effectiveOptions.maxDepth);
        const report = await discoverCandidates(root, { maxDepth });

        stdout += effectiveOptions.json ? renderDiscoverJson(report) : renderDiscoverText(report);
        exitCode = 0;
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    },
    async (options, parentOptions) => {
      try {
        const effectiveOptions = { ...parentOptions, ...options };
        const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
        const targetPath = effectiveOptions.path ? normalizeRootContainedPath(root, effectiveOptions.path) : undefined;
        const manifest = await buildManifest(root, {
          strict: Boolean(effectiveOptions.strict),
          include: effectiveOptions.include,
          exclude: effectiveOptions.exclude,
          targetPath
        });

        stdout += effectiveOptions.json ? renderManifestJson(manifest) : renderManifestText(manifest);
        exitCode = 0;
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    },
    async (options, parentOptions) => {
      try {
        const effectiveOptions = { ...parentOptions, ...options };
        const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
        const outputPath = resolve(root, normalizeRootContainedPath(root, effectiveOptions.output));
        const report = await runScan(root, { strict: false, include: [], exclude: [] });
        const baseline: BaselineFile = {
          schemaVersion: 'drctx.baseline.v1',
          tool: 'drctx',
          root: '<requested-root>',
          findings: report.findings.map((finding) => ({
            fingerprint: fingerprintFinding(finding),
            id: finding.id,
            file: finding.primarySource?.file,
            title: finding.title
          }))
        };

        await writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);
        stdout += `Wrote baseline with ${baseline.findings.length} finding(s) to ${normalizeRootContainedPath(root, effectiveOptions.output)}\n`;
        exitCode = 0;
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    },
    async (id, options) => {
      try {
        if (options.list) {
          stdout += `${allFindingReferenceIds().join('\n')}\n`;
          exitCode = 0;
          return;
        }

        if (!id) {
          throw usageError('explain requires a finding id or --list');
        }

        const reference = getFindingReference(id);
        if (!reference) {
          throw usageError(`Unknown finding id: ${id}. Run drctx explain --list to see known finding IDs.`);
        }

        stdout += options.json ? `${JSON.stringify(reference, null, 2)}\n` : renderFindingReference(reference);
        exitCode = 0;
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    }
  );

  program.configureOutput({
    writeOut: (text) => {
      stdout += text;
    },
    writeErr: (text) => {
      stderr += text;
    }
  });
  program.exitOverride();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (isCommanderHelpOrVersionExit(error)) {
      exitCode = 0;
    } else {
      throw error;
    }
  }

  return { stdout, stderr, exitCode };
}

function baselineSuppressionsFromConfig(loadedConfig: Awaited<ReturnType<typeof loadConfig>>) {
  return (
    loadedConfig.baseline?.findings.map((entry) => ({
      id: entry.id,
      file: entry.file,
      fingerprint: entry.fingerprint,
      reason: entry.reason
    })) ?? []
  );
}

function workspaceBaselineSuppressionsFromConfig(loadedConfig: Awaited<ReturnType<typeof loadConfig>>) {
  if (!loadedConfig.baselinePath || !loadedConfig.baseline) {
    return undefined;
  }

  const candidatePath = dirname(loadedConfig.baselinePath).replaceAll('\\', '/');
  return {
    candidatePath: candidatePath === '.' ? '.' : candidatePath,
    suppressions: baselineSuppressionsFromConfig(loadedConfig)
  };
}

function createProgram(
  commandName: string,
  action: (options: CliOptions, parentOptions: CliOptions) => Promise<void>,
  discoverAction: (options: DiscoverCliOptions, parentOptions: DiscoverCliOptions) => Promise<void>,
  manifestAction: (options: CliOptions, parentOptions: CliOptions) => Promise<void>,
  baselineAction: (options: BaselineCliOptions, parentOptions: CliOptions) => Promise<void>,
  explainAction: (id: string | undefined, options: ExplainCliOptions) => Promise<void>
): Command {
  const program = new Command();

  program
    .name(commandName)
    .version(toolVersion)
    .description('Diagnose context rot before your coding agent reads it')
    .option('--json', 'print JSON report')
    .option('--sarif', 'print SARIF 2.1.0 report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--workspace', 'discover and scan candidate roots under --root')
    .option('--summary-only', 'print only workspace totals')
    .option('--max-findings <number>', 'maximum workspace findings to print')
    .option('--config <path>', 'path to .drctx.json config file')
    .option('--show-suppressed', 'include suppressed findings in reports')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .option('--root <path>', 'repository root to scan')
    .action((options: CliOptions) => action(options, defaultOptions()));

  program
    .command('check')
    .description('scan the current repository')
    .option('--json', 'print JSON report')
    .option('--sarif', 'print SARIF 2.1.0 report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--workspace', 'discover and scan candidate roots under --root')
    .option('--max-depth <number>', 'maximum directory depth for workspace discovery', '3')
    .option('--inherit-parent-instructions', 'inherit root agent instructions into workspace child scans')
    .option('--summary-only', 'print only workspace totals')
    .option('--max-findings <number>', 'maximum workspace findings to print')
    .option('--config <path>', 'path to .drctx.json config file')
    .option('--show-suppressed', 'include suppressed findings in reports')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .option('--root <path>', 'repository root to scan')
    .action((options: CliOptions) => action(options, program.opts<CliOptions>()));

  program
    .command('manifest')
    .description('print the canonical repository context contract')
    .option('--json', 'print JSON manifest')
    .option('--strict', 'reserved for consistency with check')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .option('--root <path>', 'repository root to inspect')
    .option('--path <path>', 'target path for effective instruction context')
    .action((options: CliOptions) => manifestAction(options, program.opts<CliOptions>()));

  program
    .command('baseline')
    .description('write a baseline file from current findings')
    .option('--root <path>', 'repository root to scan')
    .requiredOption('--output <path>', 'baseline JSON output path')
    .action((options: BaselineCliOptions) => baselineAction(options, program.opts<CliOptions>()));

  program
    .command('discover')
    .description('discover candidate repository roots')
    .option('--json', 'print JSON report')
    .option('--root <path>', 'directory root to discover from')
    .option('--max-depth <number>', 'maximum directory depth to traverse', '3')
    .action((options: DiscoverCliOptions) => discoverAction(options, program.opts<DiscoverCliOptions>()));

  program
    .command('explain [finding-id]')
    .description('explain a Dr. Context finding id')
    .option('--json', 'print JSON explanation')
    .option('--list', 'list known finding IDs')
    .action((id: string | undefined, options: ExplainCliOptions) => explainAction(id, { ...program.opts<ExplainCliOptions>(), ...options }));

  return program;
}

function usageError(message: string): UsageError {
  return new UsageError(message);
}

function formatCliError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return error instanceof UsageError || error instanceof UsagePathError || error instanceof ConfigUsageError
    ? `Dr. Context usage error: ${message}\n`
    : `Dr. Context internal error: ${message}\n`;
}

function commandNameFromArgv(argv: string[]): string {
  const executable = argv[1] ? basename(argv[1]) : 'drctx';
  const extension = extname(executable);
  const commandName = extension ? executable.slice(0, -extension.length) : executable;

  if (!commandName || commandName === 'main') {
    return 'dr-context';
  }

  return commandName;
}

function isCommanderHelpOrVersionExit(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code?: unknown }).code === 'commander.helpDisplayed' ||
      (error as { code?: unknown }).code === 'commander.version')
  );
}

function parseMaxDepth(value = '3'): number {
  if (!/^\d+$/.test(value)) {
    throw usageError('--max-depth must be a non-negative integer');
  }

  return Number(value);
}

function parseOptionalNonNegativeInteger(value: string | undefined, optionName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    throw usageError(`${optionName} must be a non-negative integer`);
  }

  return Number(value);
}

function defaultOptions(): CliOptions {
  return { include: [], exclude: [] };
}

function renderScanReport(report: Awaited<ReturnType<typeof runScan>>, options: CliOptions): string {
  if (options.sarif) {
    return renderSarif(report);
  }

  return options.json
    ? renderJson(report, { showSuppressed: Boolean(options.showSuppressed) })
    : renderText(report, { showSuppressed: Boolean(options.showSuppressed) });
}

function renderFindingReference(reference: NonNullable<ReturnType<typeof getFindingReference>>): string {
  return [
    reference.id,
    '',
    `Category: ${reference.category}`,
    `Severity: ${reference.severityPolicy}`,
    `Confidence: ${reference.confidencePolicy}`,
    `When it fires: ${reference.whenItFires}`,
    `Evidence: ${reference.evidenceShape}`,
    `Suggested fix: ${reference.suggestedFix}`,
    `Related docs: ${reference.relatedDocs.join(', ')}`,
    ''
  ].join('\n');
}

function isEntrypoint(): boolean {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntrypoint()) {
  runCli(process.argv)
    .then((result) => {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      process.exitCode = result.exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Dr. Context internal error: ${message}\n`);
      process.exitCode = 2;
    });
}
