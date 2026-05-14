#!/usr/bin/env node
import { Command } from 'commander';
import { basename, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runScan } from '../core/runScan.js';
import { buildManifest } from '../core/buildManifest.js';
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
};
type DiscoverCliOptions = { json?: boolean; root?: string; maxDepth?: string };

export type CliResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function runCli(argv: string[]): Promise<CliResult> {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  const program = createProgram(commandNameFromArgv(argv), async (options, parentOptions) => {
    try {
      const effectiveOptions = { ...parentOptions, ...options };
      const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
      if (effectiveOptions.workspace) {
        const maxDepth = parseMaxDepth(effectiveOptions.maxDepth);
        const report = await runWorkspaceScan(root, {
          strict: Boolean(effectiveOptions.strict),
          include: effectiveOptions.include,
          exclude: effectiveOptions.exclude,
          maxDepth
        });

        stdout += effectiveOptions.json
          ? renderWorkspaceJson(report)
          : renderWorkspaceText(report, {
              summaryOnly: Boolean(effectiveOptions.summaryOnly),
              maxFindings: parseOptionalNonNegativeInteger(effectiveOptions.maxFindings, '--max-findings')
            });
        exitCode = exitCodeForWorkspaceReport(report, Boolean(effectiveOptions.strict));
        return;
      }

      const report = await runScan(root, {
        strict: Boolean(effectiveOptions.strict),
        include: effectiveOptions.include,
        exclude: effectiveOptions.exclude
      });

      stdout += renderScanReport(report, effectiveOptions);
      exitCode = exitCodeForReport(report, Boolean(effectiveOptions.strict));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderr += `Dr. Context internal error: ${message}\n`;
      exitCode = 2;
    }
  }, async (options, parentOptions) => {
    try {
      const effectiveOptions = { ...parentOptions, ...options };
      const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
      const maxDepth = parseMaxDepth(effectiveOptions.maxDepth);
      const report = await discoverCandidates(root, { maxDepth });

      stdout += effectiveOptions.json ? renderDiscoverJson(report) : renderDiscoverText(report);
      exitCode = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderr += `Dr. Context internal error: ${message}\n`;
      exitCode = 2;
    }
  }, async (options, parentOptions) => {
    try {
      const effectiveOptions = { ...parentOptions, ...options };
      const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
      const manifest = await buildManifest(root, {
        strict: Boolean(effectiveOptions.strict),
        include: effectiveOptions.include,
        exclude: effectiveOptions.exclude
      });

      stdout += effectiveOptions.json ? renderManifestJson(manifest) : renderManifestText(manifest);
      exitCode = 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stderr += `Dr. Context internal error: ${message}\n`;
      exitCode = 2;
    }
  });

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

function createProgram(
  commandName: string,
  action: (options: CliOptions, parentOptions: CliOptions) => Promise<void>,
  discoverAction: (options: DiscoverCliOptions, parentOptions: DiscoverCliOptions) => Promise<void>,
  manifestAction: (options: CliOptions, parentOptions: CliOptions) => Promise<void>
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
    .option('--summary-only', 'print only workspace totals')
    .option('--max-findings <number>', 'maximum workspace findings to print')
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
    .action((options: CliOptions) => manifestAction(options, program.opts<CliOptions>()));

  program
    .command('discover')
    .description('discover candidate repository roots')
    .option('--json', 'print JSON report')
    .option('--root <path>', 'directory root to discover from')
    .option('--max-depth <number>', 'maximum directory depth to traverse', '3')
    .action((options: DiscoverCliOptions) => discoverAction(options, program.opts<DiscoverCliOptions>()));

  return program;
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
    throw new Error('--max-depth must be a non-negative integer');
  }

  return Number(value);
}

function parseOptionalNonNegativeInteger(value: string | undefined, optionName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`${optionName} must be a non-negative integer`);
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

  return options.json ? renderJson(report) : renderText(report);
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
