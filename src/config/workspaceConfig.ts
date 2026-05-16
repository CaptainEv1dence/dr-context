import { join } from 'node:path';
import { normalizeRootContainedPath, UsagePathError } from '../core/pathGuards.js';
import { ConfigUsageError, loadOptionalConfigAtRoot } from './loadConfig.js';
import { mergeWorkspaceChildConfig } from './mergeConfig.js';
import type { LoadedConfig } from './types.js';

export type WorkspaceCandidateConfigResult = {
  config: LoadedConfig;
  loadedChildConfigPath?: string;
};

export async function loadWorkspaceCandidateConfig(
  workspaceRoot: string,
  candidatePath: string,
  parentConfig: LoadedConfig,
  options: { explicitConfig: boolean }
): Promise<WorkspaceCandidateConfigResult> {
  const normalizedCandidatePath = normalizeCandidatePath(workspaceRoot, candidatePath);

  if (isDotCandidate(normalizedCandidatePath) || options.explicitConfig) {
    return { config: parentConfig };
  }

  const childRoot = join(workspaceRoot, normalizedCandidatePath);
  const displayPath = `${normalizedCandidatePath}/.drctx.json`;

  try {
    const childConfig = await loadOptionalConfigAtRoot(childRoot);
    if (!childConfig) {
      return { config: mergeWorkspaceChildConfig(parentConfig, { suppressions: [] }) };
    }

    return {
      config: mergeWorkspaceChildConfig(parentConfig, childConfig),
      loadedChildConfigPath: displayPath
    };
  } catch (error) {
    if (error instanceof ConfigUsageError) {
      throw new ConfigUsageError(`${displayPath}: ${sanitizeConfigErrorMessage(error.message)}`);
    }
    throw error;
  }
}

function normalizeCandidatePath(workspaceRoot: string, candidatePath: string): string {
  try {
    return candidatePath === '.' ? '.' : normalizeRootContainedPath(workspaceRoot, candidatePath);
  } catch (error) {
    if (error instanceof UsagePathError) {
      throw new ConfigUsageError('candidate paths must stay inside the workspace root');
    }
    throw error;
  }
}

function isDotCandidate(candidatePath: string): boolean {
  return candidatePath === '.' || candidatePath.startsWith('.');
}

function sanitizeConfigErrorMessage(message: string): string {
  if (/invalid json/i.test(message)) {
    return 'Invalid JSON';
  }
  if (/config file not found/i.test(message)) {
    return 'Config file not found';
  }
  return message;
}
