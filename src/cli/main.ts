#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runScan } from '../core/runScan.js';
import { discoverCandidates } from '../discovery/discoverCandidates.js';
import { renderDiscoverJson } from '../reporting/discoverJsonReporter.js';
import { renderDiscoverText } from '../reporting/discoverTextReporter.js';
import { renderJson } from '../reporting/jsonReporter.js';
import { renderText } from '../reporting/textReporter.js';
import { exitCodeForReport } from './exitCodes.js';

type CliOptions = { json?: boolean; strict?: boolean; include: string[]; exclude: string[]; root?: string };
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
  const program = createProgram(async (options, parentOptions) => {
    try {
      const effectiveOptions = { ...parentOptions, ...options };
      const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
      const report = await runScan(root, {
        strict: Boolean(effectiveOptions.strict),
        include: effectiveOptions.include,
        exclude: effectiveOptions.exclude
      });

      stdout += effectiveOptions.json ? renderJson(report) : renderText(report);
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
  });

  await program.parseAsync(argv);
  return { stdout, stderr, exitCode };
}

function createProgram(
  action: (options: CliOptions, parentOptions: CliOptions) => Promise<void>,
  discoverAction: (options: DiscoverCliOptions, parentOptions: DiscoverCliOptions) => Promise<void>
): Command {
  const program = new Command();

  program
    .name('drctx')
    .description('Diagnose context rot before your coding agent reads it')
    .option('--json', 'print JSON report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .option('--root <path>', 'repository root to scan')
    .action((options: CliOptions) => action(options, defaultOptions()));

  program
    .command('check')
    .description('scan the current repository')
    .option('--json', 'print JSON report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .option('--root <path>', 'repository root to scan')
    .action((options: CliOptions) => action(options, program.opts<CliOptions>()));

  program
    .command('discover')
    .description('discover candidate repository roots')
    .option('--json', 'print JSON report')
    .option('--root <path>', 'directory root to discover from')
    .option('--max-depth <number>', 'maximum directory depth to traverse', '3')
    .action((options: DiscoverCliOptions) => discoverAction(options, program.opts<DiscoverCliOptions>()));

  return program;
}

function parseMaxDepth(value = '3'): number {
  if (!/^\d+$/.test(value)) {
    throw new Error('--max-depth must be a non-negative integer');
  }

  return Number(value);
}

function defaultOptions(): CliOptions {
  return { include: [], exclude: [] };
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
