export type CandidateType = 'git-repository' | 'agent-context-root' | 'package-root';

export type DiscoveryCandidate = {
  path: string;
  type: CandidateType;
  signals: string[];
};

export type DiscoverReport = {
  schemaVersion: 'drctx.discover.v1';
  tool: 'drctx';
  toolVersion: string;
  root: string;
  maxDepth: number;
  candidates: DiscoveryCandidate[];
  summary: {
    candidates: number;
  };
};
