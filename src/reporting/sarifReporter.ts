import type { Confidence, Finding, Report, Severity, SourceSpan } from '../core/types.js';

type SarifLog = {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
};

type SarifRun = {
  tool: {
    driver: {
      name: 'Dr. Context';
      informationUri: string;
      semanticVersion: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
};

type SarifRule = {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: SarifLevel };
  help: { text: string; markdown: string };
  properties: {
    tags: string[];
    precision: SarifPrecision;
    'problem.severity': SarifProblemSeverity;
  };
};

type SarifResult = {
  ruleId: string;
  ruleIndex: number;
  level: SarifLevel;
  message: { text: string; markdown: string };
  locations: SarifLocation[];
  partialFingerprints: { primaryLocationLineHash: string };
};

type SarifLocation = {
  physicalLocation: {
    artifactLocation: { uri: string };
    region?: { startLine?: number; startColumn?: number };
  };
};

type SarifLevel = 'error' | 'warning' | 'note';
type SarifPrecision = 'high' | 'medium' | 'low';
type SarifProblemSeverity = 'error' | 'warning' | 'recommendation';

export function renderSarif(report: Report): string {
  const rules = uniqueRules(report.findings);
  const ruleIndexById = new Map(rules.map((rule, index) => [rule.id, index]));
  const sarif: SarifLog = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Dr. Context',
            informationUri: 'https://github.com/CaptainEv1dence/dr-context',
            semanticVersion: report.toolVersion,
            rules
          }
        },
        results: report.findings.map((finding) => renderResult(finding, ruleIndexById.get(finding.id) ?? 0))
      }
    ]
  };

  return `${JSON.stringify(sarif, null, 2)}\n`;
}

function uniqueRules(findings: Finding[]): SarifRule[] {
  const rulesById = new Map<string, SarifRule>();

  for (const finding of findings) {
    if (!rulesById.has(finding.id)) {
      rulesById.set(finding.id, renderRule(finding));
    }
  }

  return [...rulesById.values()];
}

function renderRule(finding: Finding): SarifRule {
  return {
    id: finding.id,
    name: finding.id,
    shortDescription: { text: finding.title },
    fullDescription: { text: finding.title },
    defaultConfiguration: { level: levelForSeverity(finding.severity) },
    help: {
      text: helpText(finding),
      markdown: helpMarkdown(finding)
    },
    properties: {
      tags: [finding.category],
      precision: precisionForConfidence(finding.confidence),
      'problem.severity': problemSeverityForSeverity(finding.severity)
    }
  };
}

function renderResult(finding: Finding, ruleIndex: number): SarifResult {
  return {
    ruleId: finding.id,
    ruleIndex,
    level: levelForSeverity(finding.severity),
    message: {
      text: finding.title,
      markdown: resultMarkdown(finding)
    },
    locations: [locationForSource(finding.primarySource)],
    partialFingerprints: {
      primaryLocationLineHash: fingerprintForFinding(finding)
    }
  };
}

function locationForSource(source?: SourceSpan): SarifLocation {
  const region = source
    ? {
        ...(source.line ? { startLine: source.line } : {}),
        ...(source.column ? { startColumn: source.column } : {})
      }
    : undefined;

  return {
    physicalLocation: {
      artifactLocation: { uri: source?.file ?? 'AGENTS.md' },
      ...(region && Object.keys(region).length > 0 ? { region } : {})
    }
  };
}

function resultMarkdown(finding: Finding): string {
  const lines = [`**${finding.title}**`, '', `Severity: ${finding.severity}`, `Confidence: ${finding.confidence}`];

  if (finding.evidence.length > 0) {
    lines.push('', 'Evidence:', ...finding.evidence.map((evidence) => `- ${evidence.message}`));
  }

  if (finding.suggestion) {
    lines.push('', 'Suggested fix:', finding.suggestion);
  }

  return lines.join('\n');
}

function helpText(finding: Finding): string {
  return finding.suggestion ? `${finding.title}\n\nSuggested fix: ${finding.suggestion}` : finding.title;
}

function helpMarkdown(finding: Finding): string {
  return finding.suggestion ? `**${finding.title}**\n\nSuggested fix: ${finding.suggestion}` : `**${finding.title}**`;
}

function fingerprintForFinding(finding: Finding): string {
  const source = finding.primarySource;
  return [finding.id, source?.file ?? 'unknown', source?.line ?? 0, source?.text ?? finding.title].join(':');
}

function levelForSeverity(severity: Severity): SarifLevel {
  if (severity === 'error') {
    return 'error';
  }

  if (severity === 'warning') {
    return 'warning';
  }

  return 'note';
}

function problemSeverityForSeverity(severity: Severity): SarifProblemSeverity {
  if (severity === 'error') {
    return 'error';
  }

  if (severity === 'warning') {
    return 'warning';
  }

  return 'recommendation';
}

function precisionForConfidence(confidence: Confidence): SarifPrecision {
  return confidence;
}
