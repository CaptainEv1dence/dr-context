import type { Check, Finding, RawFile, SourceSpan } from '../core/types.js';

const livePolicySourcePattern = /^(?:README\.md|SECURITY\.md|docs\/SECURITY\.md|package\.json)$/i;

export const liveOperationPolicyCheck: Check = {
  id: 'missing-live-operation-boundary',
  run({ facts }) {
    if (hasLiveOperationBoundary(agentVisiblePolicyContent(facts))) {
      return [];
    }

    const evidence = facts.files.find((file) => livePolicySourcePattern.test(file.path) && hasLiveOperationSignal(file));
    if (!evidence) {
      return [];
    }

    return [liveOperationFinding(evidence)];
  }
};

function liveOperationFinding(file: RawFile): Finding {
  const source = sourceForFile(file);
  return {
    id: 'missing-live-operation-boundary',
    title: 'Live-operation boundary is missing from agent instructions',
    category: 'safety',
    severity: 'info',
    confidence: 'medium',
    primarySource: source,
    evidence: [
      {
        kind: 'live-operation-signal',
        message: `${file.path} mentions live-operation sensitive capabilities, but agent-visible instructions do not set local-only defaults and approval boundaries.`,
        source
      }
    ],
    suggestion: 'Add agent-visible guidance that defaults to local/offline/unit-test work and requires explicit approval for live, authenticated, state-changing, payment, checkout, RPC, mainnet/testnet, production, account, secret, or token actions.'
  };
}

function hasLiveOperationSignal(file: RawFile): boolean {
  const content = file.path === 'package.json' ? packageMetadataText(file.content) : file.content;
  if (hasTypeScriptContractsOnly(content)) {
    return false;
  }

  return /\b(?:payments?|checkout|sandbox|browserstack|rpc|mainnet|testnet|smart contracts?|live (?:operations?|traffic|trading|payments?|checkout)|production (?:traffic|payments?|checkout|account)|security research|bug bounty)\b/i.test(content);
}

function hasTypeScriptContractsOnly(content: string): boolean {
  return /\btypescript\b/i.test(content) && /\btype contracts?\b/i.test(content) && !/\b(?:payments?|checkout|sandbox|browserstack|rpc|mainnet|testnet|smart contracts?|live (?:operations?|traffic|trading|payments?|checkout)|production (?:traffic|payments?|checkout|account)|security research|bug bounty)\b/i.test(content);
}

function hasLiveOperationBoundary(content: string): boolean {
  return hasLocalOnlyDefault(content) && hasApprovalBoundary(content);
}

function hasLocalOnlyDefault(content: string): boolean {
  return /\b(?:default to|only|local-only|offline|unit tests?|unit-test)\b[^.\n]*(?:local-only|local|offline|unit tests?|unit-test)|\b(?:local-only|offline|unit tests?|unit-test)\b[^.\n]*(?:default|only)/i.test(content);
}

function hasApprovalBoundary(content: string): boolean {
  return /\b(?:approval|explicit approval|ask|confirm)\b[^.\n]*(?:live|authenticated|state-changing|payment|checkout|rpc|mainnet|testnet|production|account|secrets?|tokens?)|\b(?:live|authenticated|state-changing|payment|checkout|rpc|mainnet|testnet|production|account|secrets?|tokens?)\b[^.\n]*(?:approval|explicit approval|ask|confirm)/i.test(content);
}

function packageMetadataText(content: string): string {
  try {
    const parsed = JSON.parse(content) as unknown;
    return JSON.stringify(parsed);
  } catch {
    return content;
  }
}

function agentVisiblePolicyContent(facts: { agentInstructionDocs: { content: string }[]; inheritedAgentInstructionDocs: { content: string }[]; workflowPrompts: { value: string }[] }): string {
  return [
    ...facts.agentInstructionDocs.map((doc) => doc.content),
    ...facts.inheritedAgentInstructionDocs.map((doc) => doc.content),
    ...facts.workflowPrompts.map((prompt) => prompt.value)
  ].join('\n');
}

function sourceForFile(file: RawFile): SourceSpan {
  return {
    file: file.path,
    line: 1,
    text: file.content.split(/\r?\n/)[0]?.trim() ?? ''
  };
}
