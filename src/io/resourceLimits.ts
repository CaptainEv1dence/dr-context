export type WorkspaceResourceLimits = {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
};

export const defaultWorkspaceResourceLimits: WorkspaceResourceLimits = {
  maxFiles: 500,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 8 * 1024 * 1024
};
