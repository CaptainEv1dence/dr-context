import type { FindingSuppression } from '../core/types.js';

export type BaselineFinding = {
  fingerprint: string;
  id: string;
  file?: string;
  title?: string;
  reason?: string;
};

export type BaselineFile = {
  schemaVersion: 'drctx.baseline.v1';
  tool: 'drctx';
  root: '<requested-root>';
  findings: BaselineFinding[];
};

export type DrctxConfig = {
  include?: string[];
  exclude?: string[];
  strict?: boolean;
  baselinePath?: string;
  suppressions: FindingSuppression[];
};

export type LoadedConfig = DrctxConfig & {
  baseline?: BaselineFile;
};
