import type { LoadedConfig } from './types.js';

export function mergeWorkspaceChildConfig(parent: LoadedConfig, child: LoadedConfig): LoadedConfig {
  const mergedResourceLimits = mergeResourceLimits(parent.resourceLimits, child.resourceLimits);
  const baselinePath = child.baselinePath;
  const baseline = child.baseline;

  return {
    include: child.include ?? parent.include,
    exclude: child.exclude ?? parent.exclude,
    strict: child.strict ?? parent.strict,
    suppressions: [...(parent.suppressions ?? []), ...(child.suppressions ?? [])],
    resourceLimits: mergedResourceLimits,
    ...(baselinePath ? { baselinePath } : {}),
    ...(baseline ? { baseline } : {})
  };
}

function mergeResourceLimits(
  parent: LoadedConfig['resourceLimits'],
  child: LoadedConfig['resourceLimits']
): LoadedConfig['resourceLimits'] {
  if (!parent && !child) {
    return undefined;
  }

  return {
    ...(parent ?? {}),
    ...(child ?? {})
  };
}
