export type Severity = 'error' | 'warning' | 'info';

export type Confidence = 'high' | 'medium' | 'low';

export type SourceSpan = {
  file: string;
  line?: number;
  column?: number;
  text?: string;
};

export type Evidence = {
  kind: string;
  message: string;
  source?: SourceSpan;
};

export type RawFile = {
  path: string;
  content: string;
};

export type Finding = {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  primarySource?: SourceSpan;
  evidence: Evidence[];
  suggestion?: string;
};

export type FindingSuppression = {
  id: string;
  file?: string;
  fingerprint?: string;
  reason?: string;
};

export type SuppressedFinding = Finding & {
  fingerprint: string;
  suppression: FindingSuppression;
};

export type SuppressionResult = {
  findings: Finding[];
  suppressedFindings: SuppressedFinding[];
};

export type Report = {
  schemaVersion: 'drctx.report.v1';
  tool: 'drctx';
  toolVersion: string;
  root: string;
  inheritedInstructionFiles?: EffectiveInstructionFile[];
  findings: Finding[];
  suppressedFindings?: SuppressedFinding[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    suppressed?: number;
  };
};

export type WorkspaceReportEntry = {
  path: string;
  report: Report;
};

export type WorkspaceReport = {
  schemaVersion: 'drctx.workspace-report.v1';
  tool: 'drctx';
  toolVersion: string;
  root: '<requested-root>';
  reports: WorkspaceReportEntry[];
  summary: {
    roots: number;
    errors: number;
    warnings: number;
    infos: number;
    suppressed?: number;
  };
};

export type ManifestPackageManager = {
  name: PackageManagerName;
  version?: string;
  sources: SourceSpan[];
};

export type AgentInstructionTool = 'agents' | 'claude' | 'copilot' | 'cursor' | 'gemini' | 'workflow' | 'unknown';

export type AgentInstructionScope = 'repo' | 'path' | 'nested' | 'workflow';

export type AgentInstructionMetadata = Record<string, string | string[] | boolean>;

export type ManifestInstructionFile = {
  path: string;
  type: AgentInstructionTool;
  scope: AgentInstructionScope;
  appliesTo?: string[];
  metadata?: AgentInstructionMetadata;
  source: SourceSpan;
};

export type EffectiveInstructionFile = ManifestInstructionFile & {
  inherited: boolean;
  inheritedFrom?: 'workspace-parent';
  displayPath?: string;
  appliesBecause: string;
};

export type EffectiveContext = {
  targetPath?: string;
  instructionFiles: EffectiveInstructionFile[];
};

export type ManifestVerificationCommand = {
  command: string;
  source: SourceSpan;
  ciBacked: boolean;
  agentVisible: boolean;
};

export type ManifestFirstRead = {
  path: string;
  exists: boolean;
  agentVisible: boolean;
  source: SourceSpan;
};

export type Manifest = {
  schemaVersion: 'drctx.manifest.v1';
  tool: 'drctx';
  toolVersion: string;
  root: string;
  targetPath?: string;
  packageManager?: ManifestPackageManager;
  agentInstructionFiles: ManifestInstructionFile[];
  effectiveInstructionFiles?: EffectiveInstructionFile[];
  verificationCommands: ManifestVerificationCommand[];
  firstReads: ManifestFirstRead[];
  ciCommands: CiCommandMention[];
  summary: {
    agentInstructionFiles: number;
    effectiveInstructionFiles?: number;
    verificationCommands: number;
    firstReads: number;
    ciCommands: number;
  };
};

export type PackageManagerName =
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'bun'
  | 'uv'
  | 'poetry'
  | 'pip'
  | 'cargo'
  | 'go'
  | 'unknown';

export type PackageManagerEvidence = {
  name: PackageManagerName;
  source: SourceSpan;
  confidence: Confidence;
  version?: string;
  raw?: string;
};

export type ScriptFact = {
  name: string;
  command: string;
  source: SourceSpan;
};

export type CommandMention = {
  command: string;
  source: SourceSpan;
  context: 'inline-code' | 'code-block' | 'plain-text';
};

export type CiCommandClassification = 'verification' | 'install' | 'setup' | 'publish' | 'shell-control' | 'output-plumbing' | 'unknown';

export type CiCommandMention = CommandMention & {
  classification: CiCommandClassification;
};

export type BuildTargetFact = {
  tool: 'make' | 'just' | 'taskfile';
  name: string;
  source: SourceSpan;
};

export type RuntimeVersionFact = {
  runtime: 'node';
  version: string;
  kind: 'nvmrc' | 'node-version' | 'package-engines' | 'github-actions';
  source: SourceSpan;
};

export type ArchitectureDocFact = {
  path: string;
  kind: 'architecture' | 'adr' | 'design' | 'service-readme' | 'unknown';
  source: SourceSpan;
};

export type AgentInstructionDocFact = {
  path: string;
  content: string;
  tool: AgentInstructionTool;
  scope: AgentInstructionScope;
  appliesTo?: string[];
  metadata?: AgentInstructionMetadata;
  inherited?: boolean;
  inheritedFrom?: 'workspace-parent';
  displayPath?: string;
  source: SourceSpan;
};

export type LocalPathMention = {
  path: string;
  exists: boolean;
  source: SourceSpan;
};

export type RepoFacts = {
  root: string;
  packageManagers: PackageManagerEvidence[];
  scripts: ScriptFact[];
  buildTargets: BuildTargetFact[];
  runtimeVersions: RuntimeVersionFact[];
  commandMentions: CommandMention[];
  ciCommands: CiCommandMention[];
  architectureDocs: ArchitectureDocFact[];
  agentInstructionDocs: AgentInstructionDocFact[];
  inheritedAgentInstructionDocs: AgentInstructionDocFact[];
  localPathMentions: LocalPathMention[];
  files: RawFile[];
  filePaths: string[];
  keyDirectories: string[];
};

export type EffectiveConfig = {
  strict: boolean;
  include: string[];
  exclude: string[];
  suppressions?: FindingSuppression[];
  workspaceBaselineSuppressions?: WorkspaceBaselineSuppressions;
  targetPath?: string;
  inheritParentInstructions?: boolean;
  inheritedAgentInstructionDocs?: AgentInstructionDocFact[];
};

export type WorkspaceBaselineSuppressions = {
  candidatePath: string;
  suppressions: FindingSuppression[];
};

export type CheckContext = {
  facts: RepoFacts;
  config: EffectiveConfig;
};

export type Check = {
  id: string;
  run(context: CheckContext): Finding[];
};
