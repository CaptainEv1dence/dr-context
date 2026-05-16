import { join } from 'node:path';
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
  if (candidatePath === '.' || options.explicitConfig) {
    return { config: parentConfig };
  }

  const childRoot = join(workspaceRoot, candidatePath);

  try {
    const childConfig = await loadOptionalConfigAtRoot(childRoot);
    if (!childConfig) {
      return { config: parentConfig };
    }

    return {
      config: mergeWorkspaceChildConfig(parentConfig, childConfig),
      loadedChildConfigPath: `${candidatePath}/.drctx.json`
    };
  } catch (error) {
    if (error instanceof ConfigUsageError) {
      throw new ConfigUsageError(`${candidatePath}/.drctx.json: ${error.message}`);
    }
    throw error;
  }
}
