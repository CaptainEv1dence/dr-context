import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizeRootContainedPath, UsagePathError } from '../core/pathGuards.js';
import type { FindingSuppression } from '../core/types.js';
import type { BaselineFile, BaselineFinding, LoadedConfig } from './types.js';

export class ConfigUsageError extends Error {}

export async function loadConfig(root: string, options: { configPath?: string }): Promise<LoadedConfig> {
  const resolvedRoot = resolve(root);
  const configPath = options.configPath
    ? resolve(resolvedRoot, normalizeConfigPath(resolvedRoot, options.configPath))
    : resolve(resolvedRoot, '.drctx.json');

  const raw = await readOptionalJson(configPath, Boolean(options.configPath));
  if (raw === undefined) {
    return { suppressions: [] };
  }

  const config = validateConfig(raw);
  const baseline = config.baselinePath ? await loadBaseline(resolvedRoot, config.baselinePath) : undefined;

  return baseline ? { ...config, baseline } : config;
}

function normalizeConfigPath(root: string, inputPath: string): string {
  try {
    return normalizeRootContainedPath(root, inputPath);
  } catch (error) {
    if (error instanceof UsagePathError) {
      throw new ConfigUsageError('config paths must stay inside --root');
    }
    throw error;
  }
}

async function readOptionalJson(path: string, required: boolean): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (isNotFound(error)) {
      if (required) {
        throw new ConfigUsageError(`Config file not found: ${path}`);
      }
      return undefined;
    }
    if (error instanceof SyntaxError) {
      throw new ConfigUsageError(`Invalid JSON in ${path}`);
    }
    throw error;
  }
}

async function loadBaseline(root: string, baselinePath: string): Promise<BaselineFile> {
  const relativePath = normalizeConfigPath(root, baselinePath);
  const raw = await readOptionalJson(resolve(root, relativePath), true);
  return validateBaseline(raw);
}

function validateConfig(raw: unknown): LoadedConfig {
  if (!isObject(raw)) {
    throw new ConfigUsageError('Config must be a JSON object');
  }

  const allowed = new Set(['include', 'exclude', 'strict', 'baseline', 'suppressions', 'maxFiles', 'maxFileBytes', 'maxTotalBytes', '$schema']);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      throw new ConfigUsageError(`Unknown config key: ${key}`);
    }
  }

  const include = validateStringArray(raw.include, 'include');
  const exclude = validateStringArray(raw.exclude, 'exclude');
  const strict = raw.strict === undefined ? undefined : validateBoolean(raw.strict, 'strict');
  const baselinePath = raw.baseline === undefined ? undefined : validateString(raw.baseline, 'baseline');
  const suppressions = validateSuppressions(raw.suppressions ?? []);
  const resourceLimits = validateResourceLimits(raw);

  return { include, exclude, strict, baselinePath, suppressions, resourceLimits };
}

function validateResourceLimits(raw: Record<string, unknown>): LoadedConfig['resourceLimits'] {
  const maxFiles = raw.maxFiles === undefined ? undefined : validatePositiveInteger(raw.maxFiles, 'maxFiles');
  const maxFileBytes = raw.maxFileBytes === undefined ? undefined : validatePositiveInteger(raw.maxFileBytes, 'maxFileBytes');
  const maxTotalBytes = raw.maxTotalBytes === undefined ? undefined : validatePositiveInteger(raw.maxTotalBytes, 'maxTotalBytes');
  return maxFiles === undefined && maxFileBytes === undefined && maxTotalBytes === undefined
    ? undefined
    : { maxFiles, maxFileBytes, maxTotalBytes };
}

function validateBaseline(raw: unknown): BaselineFile {
  if (!isObject(raw)) {
    throw new ConfigUsageError('Baseline must be a JSON object');
  }
  if (raw.schemaVersion !== 'drctx.baseline.v1') {
    throw new ConfigUsageError('Baseline must use schemaVersion drctx.baseline.v1');
  }
  if (raw.tool !== 'drctx') {
    throw new ConfigUsageError('Baseline tool must be drctx');
  }
  if (!Array.isArray(raw.findings)) {
    throw new ConfigUsageError('Baseline findings must be an array');
  }

  return {
    schemaVersion: raw.schemaVersion,
    tool: raw.tool,
    root: '<requested-root>',
    findings: raw.findings.map(validateBaselineFinding)
  };
}

function validateBaselineFinding(raw: unknown): BaselineFinding {
  if (!isObject(raw)) {
    throw new ConfigUsageError('Baseline findings must be objects');
  }

  return {
    fingerprint: validateString(raw.fingerprint, 'baseline.finding.fingerprint'),
    id: validateString(raw.id, 'baseline.finding.id'),
    file: raw.file === undefined ? undefined : validateString(raw.file, 'baseline.finding.file'),
    title: raw.title === undefined ? undefined : validateString(raw.title, 'baseline.finding.title'),
    reason: raw.reason === undefined ? undefined : validateString(raw.reason, 'baseline.finding.reason')
  };
}

function validateSuppressions(raw: unknown): FindingSuppression[] {
  if (!Array.isArray(raw)) {
    throw new ConfigUsageError('suppressions must be an array');
  }
  return raw.map((entry) => {
    if (!isObject(entry)) {
      throw new ConfigUsageError('each suppression must be an object');
    }
    const id = validateString(entry.id, 'suppression.id');
    const file = entry.file === undefined ? undefined : validateString(entry.file, 'suppression.file');
    const fingerprint = entry.fingerprint === undefined ? undefined : validateString(entry.fingerprint, 'suppression.fingerprint');
    const reason = entry.reason === undefined ? undefined : validateString(entry.reason, 'suppression.reason');
    if (!file && !fingerprint) {
      throw new ConfigUsageError('each suppression must include file or fingerprint');
    }
    return { id, file, fingerprint, reason };
  });
}

function validateStringArray(value: unknown, key: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ConfigUsageError(`${key} must be a string array`);
  }
  return value;
}

function validateString(value: unknown, key: string): string {
  if (typeof value !== 'string') {
    throw new ConfigUsageError(`${key} must be a string`);
  }
  return value;
}

function validateBoolean(value: unknown, key: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ConfigUsageError(`${key} must be a boolean`);
  }
  return value;
}

function validatePositiveInteger(value: unknown, key: string): number {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1) {
    throw new ConfigUsageError(`${key} must be a positive integer`);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
