import type { Check, Finding, RawFile, SourceSpan } from '../core/types.js';

type PolicyFamily = {
  id: string;
  title: string;
  evidenceKind: string;
  category: string;
  canonicalMatches(content: string): boolean;
  agentVisibleMatches(content: string): boolean;
  severity(content: string, file: string): Finding['severity'];
  suggestion: string;
};

const canonicalPolicyPathPattern = /^(?:SECURITY\.md|CONTRIBUTING\.md|docs\/SECURITY\.md|docs\/CONTRIBUTING\.md|README\.md|docs\/.+|\.github\/pull_request_template\.md|\.github\/ISSUE_TEMPLATE\/.+\.(?:md|ya?ml))$/i;

const policyFamilies: PolicyFamily[] = [
  {
    id: 'hidden-secret-hygiene-policy',
    title: 'Secret hygiene policy is hidden from agent instructions',
    evidenceKind: 'canonical-secret-policy',
    category: 'safety',
    canonicalMatches: hasSecretGuidance,
    agentVisibleMatches: hasSecretGuidance,
    severity: (content, file) => (isStrongSecretPolicy(content) && /(?:^|\/)(?:SECURITY|CONTRIBUTING)\.md$/i.test(file) ? 'warning' : 'info'),
    suggestion: 'Add the secret hygiene policy to agent-visible instructions or link to the canonical policy from an agent-visible file.'
  },
  {
    id: 'hidden-destructive-action-policy',
    title: 'Destructive action policy is hidden from agent instructions',
    evidenceKind: 'canonical-destructive-action-policy',
    category: 'safety',
    canonicalMatches: hasDestructiveGuidance,
    agentVisibleMatches: hasDestructiveGuidance,
    severity: (content) => (hasProhibition(content) ? 'warning' : 'info'),
    suggestion: 'Add destructive-action boundaries to agent-visible instructions or link to the canonical policy from an agent-visible file.'
  },
  {
    id: 'hidden-workflow-policy',
    title: 'Workflow policy is hidden from agent instructions',
    evidenceKind: 'canonical-workflow-policy',
    category: 'workflow',
    canonicalMatches: hasWorkflowGuidance,
    agentVisibleMatches: hasWorkflowGuidance,
    severity: () => 'info',
    suggestion: 'Add TDD, review, or verification workflow guidance to agent-visible instructions or link to the canonical policy from an agent-visible file.'
  }
];

export const hiddenPolicyVisibilityChecks: Check[] = policyFamilies.map((family) => ({
  id: family.id,
  run({ facts }) {
    const agentVisibleContent = agentVisiblePolicyContent(facts);
    if (family.agentVisibleMatches(agentVisibleContent)) {
      return [];
    }

    const source = facts.files.find((file) => canonicalPolicyPathPattern.test(file.path) && !facts.agentInstructionDocs.some((doc) => doc.path === file.path) && family.canonicalMatches(file.content));
    if (!source) {
      return [];
    }

    return [policyFinding(family, source, family.severity(source.content, source.path))];
  }
}));

export const missingGeneratedFileBoundaryCheck: Check = {
  id: 'missing-generated-file-boundary',
  run({ facts }) {
    const agentVisibleContent = agentVisiblePolicyContent(facts);
    if (hasGeneratedBoundaryGuidance(agentVisibleContent)) {
      return [];
    }

    const evidence = facts.files.flatMap(generatedArtifactEvidence)[0];
    if (!evidence) {
      return [];
    }

    return [
      {
        id: 'missing-generated-file-boundary',
        title: 'Generated artifact boundary is missing from agent instructions',
        category: 'agent-instructions',
        severity: 'info',
        confidence: 'high',
        primarySource: evidence.source,
        evidence: [
          {
            kind: 'generated-artifact-metadata',
            message: evidence.message,
            source: evidence.source
          }
        ],
        suggestion: 'Document whether generated outputs should be edited directly in agent-visible instructions.'
      }
    ];
  }
};

function policyFinding(family: PolicyFamily, file: RawFile, severity: Finding['severity']): Finding {
  const source = sourceForFile(file);
  return {
    id: family.id,
    title: family.title,
    category: family.category,
    severity,
    confidence: 'high',
    primarySource: source,
    evidence: [
      {
        kind: family.evidenceKind,
        message: `${file.path} contains canonical policy guidance that is not visible in agent instruction files.`,
        source
      }
    ],
    suggestion: family.suggestion
  };
}

function generatedArtifactEvidence(file: RawFile): { message: string; source: SourceSpan }[] {
  if (!file.path.endsWith('package.json')) {
    return [];
  }

  const parsed = parsePackageJson(file.content);
  if (!isRecord(parsed)) {
    return [];
  }

  const messages: string[] = [];
  for (const key of ['main', 'types'] as const) {
    if (typeof parsed[key] === 'string' && namesGeneratedOutput(parsed[key])) {
      messages.push(`${file.path} ${key} points to ${parsed[key]}.`);
    }
  }

  if (Array.isArray(parsed.files) && parsed.files.some((entry) => typeof entry === 'string' && namesGeneratedOutput(entry))) {
    messages.push(`${file.path} files includes generated output entries.`);
  }

  if (typeof parsed.bin === 'string' && namesGeneratedOutput(parsed.bin)) {
    messages.push(`${file.path} bin points to generated output.`);
  }

  if (isRecord(parsed.bin) && Object.values(parsed.bin).some((entry) => typeof entry === 'string' && namesGeneratedOutput(entry))) {
    messages.push(`${file.path} bin points to generated output.`);
  }

  if (isRecord(parsed.scripts)) {
    for (const [name, command] of Object.entries(parsed.scripts)) {
      if (/^(?:build|prebuild|generate-version)$/.test(name) && typeof command === 'string' && namesGeneratedOutput(command)) {
        messages.push(`${file.path} script ${name} names generated output.`);
      }
    }
  }

  return messages.map((message) => ({ message, source: sourceForFile(file) }));
}

function hasSecretGuidance(content: string): boolean {
  return /\b(?:secrets?|tokens?|credentials?)\b|\.env\b/i.test(content);
}

function isStrongSecretPolicy(content: string): boolean {
  return /\b(?:do not|don't|never|must not|avoid)\b[^.\n]*(?:secrets?|tokens?|credentials?|\.env\b)/i.test(content);
}

function hasDestructiveGuidance(content: string): boolean {
  return /\b(?:force push|reset --hard|rm -rf|drop table|delete branch|production|destructive|irreversible)\b/i.test(content);
}

function hasProhibition(content: string): boolean {
  return /\b(?:do not|don't|never|must not|without approval|requires approval|prohibit|forbid)\b/i.test(content);
}

function hasWorkflowGuidance(content: string): boolean {
  return /\buse TDD\b|\bTDD\b|\brun tests before (?:committing|commit|merge|opening)|\brequest review before merge\b|\bverify changes? before\b|\bupdate changelog\b|\brelease gate\b|\bself-scan\b/i.test(content);
}

function hasGeneratedBoundaryGuidance(content: string): boolean {
  return /\b(?:generated|dist|build)\b[^.\n]*(?:do not edit|don't edit|never edit|should not be edited|not edit|generated output|directly)/i.test(content);
}

function namesGeneratedOutput(value: string): boolean {
  return /(?:^|[./\\\s"'])(?:dist|build|generated)(?:$|[./\\\s"'/*-])/i.test(value);
}

function parsePackageJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function agentVisiblePolicyContent(facts: { agentInstructionDocs: { content: string }[]; workflowPrompts: { value: string }[] }): string {
  return [...facts.agentInstructionDocs.map((doc) => doc.content), ...facts.workflowPrompts.map((prompt) => prompt.value)].join('\n');
}

function sourceForFile(file: RawFile): SourceSpan {
  return {
    file: file.path,
    line: 1,
    text: file.content.split(/\r?\n/)[0]?.trim() ?? ''
  };
}
