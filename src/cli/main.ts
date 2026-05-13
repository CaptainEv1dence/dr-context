#!/usr/bin/env node
import { Command } from 'commander';
import { pathToFileURL } from 'node:url';
import { runScan } from '../core/runScan.js';
import { renderJson } from '../reporting/jsonReporter.js';
import { renderText } from '../reporting/textReporter.js';
import { exitCodeForReport } from './exitCodes.js';

type CliOptions = { json?: boolean; strict?: boolean; include: string[]; exclude: string[] };

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
      const report = await runScan(process.cwd(), {
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
  });

  await program.parseAsync(argv);
  return { stdout, stderr, exitCode };
}

function createProgram(action: (options: CliOptions, parentOptions: CliOptions) => Promise<void>): Command {
  const program = new Command();

  program
    .name('drctx')
    .description('Diagnose context rot before your coding agent reads it')
    .option('--json', 'print JSON report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .action((options: CliOptions) => action(options, defaultOptions()));

  program
    .command('check')
    .description('scan the current repository')
    .option('--json', 'print JSON report')
    .option('--strict', 'exit non-zero on warnings')
    .option('--include <glob...>', 'include globs', [])
    .option('--exclude <glob...>', 'exclude globs', [])
    .action((options: CliOptions) => action(options, program.opts<CliOptions>()));

  return program;
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
