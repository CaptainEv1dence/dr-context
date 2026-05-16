import type { Finding } from './types.js';

export type FindingReference = {
  id: Finding['id'];
  category: string;
  severityPolicy: string;
  confidencePolicy: string;
  whenItFires: string;
  evidenceShape: string;
  suggestedFix: string;
  relatedDocs: string[];
};

export const findingReferences: FindingReference[] = [
  {
    id: 'agent-doc-command-drift',
    category: 'Commands and verification consistency',
    severityPolicy: 'Warning when agent instruction files disagree about which package manager should run the same package script.',
    confidencePolicy: 'High confidence because the check compares parsed package-manager script invocations across agent instruction files.',
    whenItFires: 'Two or more agent instruction files mention the same package script using different JavaScript package managers.',
    evidenceShape: 'Agent-command evidence entries for each conflicting instruction command, including source file and line when available.',
    suggestedFix: 'Update agent instruction files to use the same package manager and verification command for the package script.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'ci-doc-command-mismatch',
    category: 'Commands and verification consistency',
    severityPolicy: 'Warning when CI runs a local verification or build script that agent-visible instructions do not mention.',
    confidencePolicy: 'High confidence because CI command facts and package script facts are deterministic local repository facts.',
    whenItFires: 'CI runs a verification or build package script and agent-visible instructions omit that CI-backed command.',
    evidenceShape: 'CI-command, agent-visible-command, and package-json-script entries showing the CI-backed local command gap.',
    suggestedFix: 'Add the CI-backed command to agent verification instructions so local agent checks match CI expectations.',
    relatedDocs: ['README.md', 'docs/github-action.md', 'docs/triage-findings.md']
  },
  {
    id: 'duplicate-instruction-block',
    category: 'Instruction rule quality and maintainability',
    severityPolicy: 'Info when duplicated instruction content creates maintainability risk without proving immediate behavioral drift.',
    confidencePolicy: 'High confidence because duplicate blocks are detected from normalized instruction text and workflow prompts.',
    whenItFires: 'The same substantial normalized instruction block appears on multiple instruction surfaces or embedded workflow prompts.',
    evidenceShape: 'Duplicate-instruction-block entries pointing to each surface that contains the repeated instruction content.',
    suggestedFix: 'Keep the rule in one canonical place and reference that source from narrower instruction surfaces.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'hidden-architecture-doc',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Warning when an architecture source of truth exists but is hidden from agent-visible first-read instructions.',
    confidencePolicy: 'High confidence because the check uses discovered architecture docs and agent instruction content.',
    whenItFires: 'An architecture source of truth exists, but agent instructions do not mention its exact path.',
    evidenceShape: 'Architecture-doc and agent-instructions or generic-architecture-reference entries showing the hidden architecture source and visible instructions.',
    suggestedFix: 'Mention the exact architecture doc path in agent-visible first-read instructions so agents load the source of truth.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'hidden-destructive-action-policy',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Warning when the canonical policy contains a prohibition, otherwise info for hidden destructive-action boundaries.',
    confidencePolicy: 'High confidence because the check compares canonical policy file content with agent-visible policy content.',
    whenItFires: 'Canonical policy docs contain destructive-action boundaries that are not visible in agent instruction files.',
    evidenceShape: 'Canonical-destructive-action-policy evidence with the canonical policy file source that contains the hidden boundary.',
    suggestedFix: 'Add destructive-action boundaries to agent-visible instructions or link to the canonical policy from an agent-visible file.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'hidden-secret-hygiene-policy',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Warning for strong hidden policy in SECURITY.md or CONTRIBUTING.md, otherwise info for missing visibility.',
    confidencePolicy: 'High confidence because the check compares canonical policy file content with agent-visible policy content.',
    whenItFires: 'Canonical policy docs contain secret hygiene guidance that is not visible in agent instruction files.',
    evidenceShape: 'Canonical-secret-policy evidence with the canonical policy file source that contains the hidden secret guidance.',
    suggestedFix: 'Add the secret hygiene policy to agent-visible instructions or link to it from an agent-visible file.',
    relatedDocs: ['docs/triage-findings.md', 'docs/false-positive-tracking.md']
  },
  {
    id: 'hidden-workflow-policy',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when workflow guidance exists in canonical docs but is not visible to agents during local work.',
    confidencePolicy: 'High confidence because the check compares canonical workflow policy content with agent-visible policy content.',
    whenItFires: 'Canonical policy docs contain TDD, review, verification, changelog, release, or self-scan guidance hidden from agents.',
    evidenceShape: 'Canonical-workflow-policy evidence with the canonical policy file source that contains the hidden workflow guidance.',
    suggestedFix: 'Add workflow guidance to agent-visible instructions or link to the canonical policy from an agent-visible file.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'hidden-workflow-prompt',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when workflow-embedded prompt guidance exists but no repo-visible agent instruction file is present.',
    confidencePolicy: 'High confidence because workflow prompt facts exist and no repo-visible agent instruction file was found.',
    whenItFires: 'An agent prompt is embedded only in a workflow and no repo-visible agent instruction file exists.',
    evidenceShape: 'Workflow-prompt evidence with workflow file and line span when the embedded prompt location is available.',
    suggestedFix: 'Add or reference canonical agent instructions in AGENTS.md or CLAUDE.md so workflow guidance is visible locally.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'invalid-scoped-rule-glob',
    category: 'Scoped rule quality and targeting',
    severityPolicy: 'Warning when a Cursor scoped rule declares a glob pattern that cannot be evaluated correctly.',
    confidencePolicy: 'High confidence because the finding is based on deterministic local glob validation.',
    whenItFires: 'A Cursor scoped rule declares an invalid glob pattern in its rule metadata or configuration.',
    evidenceShape: 'Scoped-rule-glob evidence with the Cursor rule source and the invalid glob that needs correction.',
    suggestedFix: 'Fix or remove the invalid scoped glob so the scoped rule can be applied predictably.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'missing-generated-file-boundary',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when package metadata names generated outputs but agent instructions omit generated-file edit boundaries.',
    confidencePolicy: 'High confidence because the check uses package metadata that explicitly names generated output files.',
    whenItFires: 'Package metadata points to generated outputs but agent-visible instructions do not say whether to edit generated files directly.',
    evidenceShape: 'Generated-artifact-metadata evidence with package metadata source for the generated output declaration.',
    suggestedFix: 'Document the generated-file editing boundary in agent-visible instructions before agents modify those outputs.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'missing-live-operation-boundary',
    category: 'Workflow prompt and instruction safety',
    severityPolicy: 'Info when live-operation sensitive repository docs or metadata lack visible local-only and approval boundaries.',
    confidencePolicy: 'Medium confidence because sensitive capability words are heuristics filtered by explicit local-only and approval guidance.',
    whenItFires: 'README, SECURITY docs, or package metadata mention payment, checkout, sandbox, RPC, chain/network, trading, live, security research, or bug bounty capabilities without agent-visible live-operation boundaries.',
    evidenceShape: 'Live-operation-signal evidence with the source file that contains the sensitive capability wording.',
    suggestedFix: 'Add agent-visible instructions that default to local/offline/unit-test work and require explicit approval for live, authenticated, state-changing, payment, checkout, RPC, network, production, account, secret, or token actions.',
    relatedDocs: ['docs/triage-findings.md', 'docs/false-positive-tracking.md']
  },
  {
    id: 'missing-readme-verification',
    category: 'Commands and verification consistency',
    severityPolicy: 'Info when README.md exists but omits recognizable local verification guidance already present in CI.',
    confidencePolicy: 'Medium confidence because README completeness is inferred from CI verification commands and README wording.',
    whenItFires: 'README.md exists, CI has at least one local verification command, and README.md does not mention that command or its package-manager alias.',
    evidenceShape: 'Readme and ci-command entries showing the README source and the local CI-backed command.',
    suggestedFix: 'Add a README verification section that names the local CI-backed verification command.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'missing-verification-command',
    category: 'Commands and verification consistency',
    severityPolicy: 'Warning when a known local verification script is available but missing from agent-visible instructions.',
    confidencePolicy: 'High confidence when known verification script names are absent from CI and agent instruction command mentions.',
    whenItFires: 'A verification script exists, is not already represented in CI, and no agent-visible instruction mentions it.',
    evidenceShape: 'Package-json-script, agent-visible-command, and optional package-manager evidence for the omitted verification command.',
    suggestedFix: 'Add the exact verification command to agent-visible instructions using the repository package manager.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'multiple-package-lockfiles',
    category: 'Runtime and package metadata hygiene',
    severityPolicy: 'Warning when multiple JavaScript package manager lockfiles create ambiguous dependency management signals.',
    confidencePolicy: 'High confidence because lockfile names deterministically indicate JavaScript package manager usage.',
    whenItFires: 'More than one JavaScript package manager lockfile is present in the scanned repository root.',
    evidenceShape: 'One lockfile evidence entry per detected lockfile, with source paths for each package manager lockfile.',
    suggestedFix: 'Keep one JavaScript package manager lockfile and remove stale lockfiles from other package managers.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'no-agent-instructions',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when repository facts exist but no supported agent instruction file was discovered for agents.',
    confidencePolicy: 'High confidence because repository facts exist and no supported agent instruction file was found.',
    whenItFires: 'Dr. Context finds repository facts but no agent-visible instruction file in the supported instruction surfaces.',
    evidenceShape: 'Agent-instructions evidence without a source span because the missing instruction file has no source location.',
    suggestedFix: 'Add AGENTS.md or another supported agent instruction file with exact verification commands and first-read docs.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'no-scannable-context',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when no supported local context files were found and a clean scan would otherwise be misleading.',
    confidencePolicy: 'High confidence because no supported local context or repository fact files were found during discovery.',
    whenItFires: 'Dr. Context finds no supported agent instructions, package files, CI workflows, architecture docs, commands, or prompts.',
    evidenceShape: 'Workspace-discovery evidence without a source span because there is no source file to point at.',
    suggestedFix: 'Run at a repository root or add supported context files such as AGENTS.md, package.json, or CI workflows.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'parent-policy-not-inherited',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when workspace parent instruction docs exist but child scans do not inherit them.',
    confidencePolicy: 'High confidence because workspace scan extracts parent instruction docs and passes them to child scans when inheritance is disabled.',
    whenItFires: 'A workspace scan discovers parent agent instruction docs and scans a child candidate without parent instruction inheritance enabled.',
    evidenceShape: 'Parent-agent-instructions evidence pointing to the parent instruction doc visible from the requested workspace root.',
    suggestedFix: 'Enable parent instruction inheritance for workspace scans or copy/link the parent policy into child agent-visible instructions.',
    relatedDocs: ['docs/triage-findings.md', 'docs/instruction-surface-coverage.md']
  },
  {
    id: 'node-runtime-drift',
    category: 'Runtime and package metadata hygiene',
    severityPolicy: 'Error when deterministic Node runtime declarations conflict and do not describe overlapping supported versions.',
    confidencePolicy: 'High confidence unless either compared runtime fact has medium confidence, in which case the finding is medium confidence.',
    whenItFires: 'Deterministic Node runtime declarations do not overlap, such as an exact local version conflicting with CI setup-node or engines.',
    evidenceShape: 'Two runtime-version evidence entries with root-relative files and line spans for the conflicting declarations.',
    suggestedFix: 'Align Node declarations so version files, package engines, and CI use overlapping Node versions.',
    relatedDocs: ['README.md', 'docs/examples/context-rot-before-after.md']
  },
  {
    id: 'oversized-instruction-file',
    category: 'Instruction rule quality and maintainability',
    severityPolicy: 'Info when an instruction surface is too large and may reduce agent reliability or readability.',
    confidencePolicy: 'High confidence because size is measured against line and byte thresholds for instruction files and workflow prompts.',
    whenItFires: 'An instruction surface is larger than the supported threshold or an embedded workflow prompt exceeds its byte threshold.',
    evidenceShape: 'Instruction-size evidence with file or workflow prompt source and the measured size signal.',
    suggestedFix: 'Split into smaller scoped files or link to canonical docs instead of embedding long content directly.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'package-manager-drift',
    category: 'Commands and verification consistency',
    severityPolicy: 'Error when deterministic evidence shows a package-manager conflict across instructions, metadata, workflows, or lockfiles.',
    confidencePolicy: 'Follows canonical package-manager evidence and may be high or medium depending on evidence strength.',
    whenItFires: 'A repository declares or strongly evidences one JavaScript package manager while docs, instructions, or CI use another.',
    evidenceShape: 'Package metadata, lockfile, workflow setup, and command-mention evidence with source locations where available.',
    suggestedFix: 'Update agent-visible instructions and docs to use the canonical package-manager command, or fix stale metadata and lockfiles.',
    relatedDocs: ['README.md', 'docs/demo.md', 'docs/examples/context-rot-before-after.md', 'docs/triage-findings.md']
  },
  {
    id: 'placeholder-test-script',
    category: 'Commands and verification consistency',
    severityPolicy: 'Warning when package.json defines a placeholder test script instead of a real verification command.',
    confidencePolicy: 'High confidence because the check recognizes the common placeholder test script that exits with failure.',
    whenItFires: 'package.json defines a placeholder failing test script instead of a real test or verification command.',
    evidenceShape: 'Package-json-script evidence with the package.json source span for the placeholder script definition.',
    suggestedFix: 'Replace the placeholder with a real verification command or remove the placeholder test script.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'scoped-rule-matches-no-files',
    category: 'Scoped rule quality and targeting',
    severityPolicy: 'Info when a valid Cursor scoped rule glob does not match any files in the current workspace snapshot.',
    confidencePolicy: 'Medium confidence because a valid glob matched no current files, but that may be intentional for future files.',
    whenItFires: 'A Cursor scoped rule glob is valid but matches no files in the current workspace snapshot.',
    evidenceShape: 'Scoped-rule-glob evidence with the Cursor rule source and the glob that matched no workspace files.',
    suggestedFix: 'Update the glob or remove the stale scoped rule if it is not intended for future workspace files.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'scoped-rule-too-broad',
    category: 'Scoped rule quality and targeting',
    severityPolicy: 'Info when a Cursor scoped rule glob appears too broad for the current workspace file set.',
    confidencePolicy: 'Low confidence because broadness is deterministic but may be intentional for repository-wide rules.',
    whenItFires: 'A Cursor scoped rule glob matches most files in a workspace that contains more than ten files.',
    evidenceShape: 'Scoped-rule-glob evidence with match count, file count, and Cursor rule source for the broad rule.',
    suggestedFix: 'Narrow the glob if the rule is not intended to apply to most files in the workspace.',
    relatedDocs: ['docs/instruction-surface-coverage.md']
  },
  {
    id: 'stale-file-reference',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Warning when agent instructions point agents at a local file path that does not exist.',
    confidencePolicy: 'High confidence because the check compares local path mentions in agent instructions with repository file existence.',
    whenItFires: 'Agent instructions reference a local file path that does not exist, excluding placeholder paths such as path/to examples.',
    evidenceShape: 'Missing-local-file evidence with the instruction source span for the stale local file reference.',
    suggestedFix: 'Update or remove the missing file reference so agents do not follow stale first-read guidance.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'stale-package-script-reference',
    category: 'Commands and verification consistency',
    severityPolicy: 'Error when documented package-manager commands name scripts that are not defined in package.json.',
    confidencePolicy: 'High confidence because the check compares parsed package-manager script invocations with package.json scripts.',
    whenItFires: 'A documented package-manager script invocation names a script that is not defined in package.json.',
    evidenceShape: 'Command-mention evidence for the stale command and package-json-scripts evidence for available script names.',
    suggestedFix: 'Add the missing script, remove the stale command, or update the command to an available script.',
    relatedDocs: ['docs/demo.md', 'docs/triage-findings.md']
  },
  {
    id: 'unindexed-context-history',
    category: 'Context coverage and policy visibility',
    severityPolicy: 'Info when many dated docs/superpowers history files exist without a current index.',
    confidencePolicy: 'Medium confidence because dated history volume suggests navigation risk but may be intentional.',
    whenItFires: 'At least eight dated files exist under docs/superpowers/plans, specs, or reports and no docs/superpowers README, index, or current file has status markers.',
    evidenceShape: 'Dated-context-history evidence with the count and a representative history file source.',
    suggestedFix: 'Add docs/superpowers/README.md or docs/superpowers/current.md with active, done, shipped, or superseded markers.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'unsafe-agent-instructions',
    category: 'Workflow prompt and instruction safety',
    severityPolicy: 'Warning when agent instructions include bypass guidance that may undermine verification or repository safety.',
    confidencePolicy: 'Medium confidence because deterministic unsafe phrase matches are filtered with explicit negation handling.',
    whenItFires: 'An agent instruction line includes guidance such as skipping tests, ignoring lint, using no-verify, or force pushing without negation.',
    evidenceShape: 'Unsafe-guidance evidence with the instruction file line span that contains the unsafe guidance.',
    suggestedFix: 'Replace bypass guidance with explicit verification and safety expectations in agent-visible instructions.',
    relatedDocs: ['docs/triage-findings.md', 'docs/false-positive-tracking.md']
  },
  {
    id: 'unsafe-workflow-prompt',
    category: 'Workflow prompt and instruction safety',
    severityPolicy: 'Warning when workflow-embedded agent prompts include bypass guidance that may undermine safety or verification.',
    confidencePolicy: 'Medium confidence because deterministic unsafe phrase matches are filtered with explicit negation handling.',
    whenItFires: 'A workflow-embedded agent prompt includes guidance such as skipping tests, ignoring lint, no-verify, or force pushing without negation.',
    evidenceShape: 'Workflow-prompt evidence with workflow file and line span when the unsafe embedded prompt location is available.',
    suggestedFix: 'Move safe agent guidance into repo-visible instructions and replace bypass guidance with explicit verification expectations.',
    relatedDocs: ['docs/triage-findings.md']
  },
  {
    id: 'verification-command-conflict',
    category: 'Commands and verification consistency',
    severityPolicy: 'Error when agent instructions and CI disagree on the package manager for the same verification script.',
    confidencePolicy: 'Inherits the canonical package manager evidence confidence from the repository package-manager facts.',
    whenItFires: 'Agent instructions tell agents to run a verification script with one package manager while CI runs it with the canonical manager.',
    evidenceShape: 'Agent-visible-command, ci-command, package-json-script, and package-manager entries for the conflicting verification command.',
    suggestedFix: 'Replace the agent instruction command with the canonical package-manager command used by the repository and CI.',
    relatedDocs: ['README.md', 'docs/demo.md', 'docs/github-action.md']
  }
];

export function allFindingReferenceIds(): string[] {
  return findingReferences.map((reference) => reference.id).sort();
}

export function getFindingReference(id: string): FindingReference | undefined {
  return findingReferences.find((reference) => reference.id === id);
}
