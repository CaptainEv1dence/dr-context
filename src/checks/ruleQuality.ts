import type { AgentInstructionDocFact, Check, Finding, SourceSpan, WorkflowPrompt } from '../core/types.js';

const genericAgentDocLineLimit = 500;
const genericAgentDocByteLimit = 30 * 1024;
const cursorScopedRuleLineLimit = 500;
const workflowPromptByteLimit = 12 * 1024;
const duplicateLineMinimum = 5;
const duplicateCharMinimum = 300;

type InstructionBlock = {
  fingerprint: string;
  normalized: string;
  nonEmptyLines: number;
  source: SourceSpan;
};

export const oversizedInstructionFileCheck: Check = {
  id: 'oversized-instruction-file',
  run({ facts }) {
    return [
      ...facts.agentInstructionDocs.flatMap(oversizedInstructionDocFindings),
      ...facts.workflowPrompts.flatMap(oversizedWorkflowPromptFindings)
    ];
  }
};

export const duplicateInstructionBlockCheck: Check = {
  id: 'duplicate-instruction-block',
  run({ facts }) {
    const blocks = [
      ...facts.agentInstructionDocs.flatMap(blocksFromInstructionDoc),
      ...facts.workflowPrompts.flatMap(blocksFromWorkflowPrompt)
    ];
    const byFingerprint = new Map<string, InstructionBlock[]>();

    for (const block of blocks) {
      const entries = byFingerprint.get(block.fingerprint) ?? [];
      entries.push(block);
      byFingerprint.set(block.fingerprint, entries);
    }

    return [...byFingerprint.values()].flatMap((entries) => duplicateFinding(entries));
  }
};

function oversizedInstructionDocFindings(doc: AgentInstructionDocFact): Finding[] {
  const lineCount = countLines(doc.content);
  const byteCount = Buffer.byteLength(doc.content, 'utf8');
  const isCursorScopedRule = doc.tool === 'cursor' && doc.metadata?.scopedRule === true;
  const oversized = isCursorScopedRule ? lineCount > cursorScopedRuleLineLimit : lineCount > genericAgentDocLineLimit || byteCount > genericAgentDocByteLimit;

  if (!oversized) {
    return [];
  }

  const threshold = isCursorScopedRule
    ? `more than ${cursorScopedRuleLineLimit} lines`
    : `more than ${genericAgentDocLineLimit} lines or more than ${genericAgentDocByteLimit} bytes`;

  return [oversizedFinding(doc.source, `${doc.path} has ${lineCount} lines and ${byteCount} bytes, exceeding ${threshold}.`)];
}

function oversizedWorkflowPromptFindings(prompt: WorkflowPrompt): Finding[] {
  const byteCount = Buffer.byteLength(prompt.value, 'utf8');
  if (byteCount <= workflowPromptByteLimit) {
    return [];
  }

  return [
    oversizedFinding(
      prompt.source,
      `${prompt.source.file}:${prompt.source.line ?? 1} embeds a ${prompt.kind} with ${byteCount} bytes, exceeding ${workflowPromptByteLimit} bytes.`
    )
  ];
}

function oversizedFinding(source: SourceSpan, message: string): Finding {
  return {
    id: 'oversized-instruction-file',
    title: 'Instruction surface is oversized',
    category: 'agent-instructions',
    severity: 'info',
    confidence: 'high',
    primarySource: source,
    evidence: [
      {
        kind: 'instruction-size',
        message,
        source
      }
    ],
    suggestion: 'Split this into smaller scoped files or link to canonical docs instead of embedding long content.'
  };
}

function blocksFromInstructionDoc(doc: AgentInstructionDocFact): InstructionBlock[] {
  return blocksFromContent(stripFrontmatter(doc.content), doc.source);
}

function blocksFromWorkflowPrompt(prompt: WorkflowPrompt): InstructionBlock[] {
  return blocksFromContent(prompt.value, prompt.source);
}

function blocksFromContent(content: string, source: SourceSpan): InstructionBlock[] {
  const stripped = stripFrontmatter(content);
  const byFingerprint = new Map<string, InstructionBlock>();
  for (const block of [stripped, ...stripped.split(/(?:\r?\n\s*){2,}/)]) {
    for (const normalized of normalizedBlock(block, source)) {
      byFingerprint.set(normalized.fingerprint, normalized);
    }
  }

  for (const window of normalizedLineWindows(stripped, source)) {
    byFingerprint.set(window.fingerprint, window);
  }

  return [...byFingerprint.values()];
}

function normalizedBlock(content: string, source: SourceSpan): InstructionBlock[] {
  const normalizedLines = content.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const normalized = normalizedLines.join(' ').replace(/\s+/g, ' ').trim();

  if (normalizedLines.length < duplicateLineMinimum && normalized.length < duplicateCharMinimum) {
    return [];
  }

  return [
    {
      fingerprint: normalized,
      normalized,
      nonEmptyLines: normalizedLines.length,
      source
    }
  ];
}

function normalizedLineWindows(content: string, source: SourceSpan): InstructionBlock[] {
  const normalizedLines = content.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const windows: InstructionBlock[] = [];

  for (let start = 0; start <= normalizedLines.length - duplicateLineMinimum; start += 1) {
    const lines = normalizedLines.slice(start, start + duplicateLineMinimum);
    const normalized = lines.join(' ').replace(/\s+/g, ' ').trim();
    windows.push({
      fingerprint: normalized,
      normalized,
      nonEmptyLines: lines.length,
      source
    });
  }

  return windows;
}

function duplicateFinding(entries: InstructionBlock[]): Finding[] {
  if (entries.length < 2) {
    return [];
  }

  const [first, second] = entries;
  return [
    {
      id: 'duplicate-instruction-block',
      title: 'Instruction block is duplicated across surfaces',
      category: 'agent-instructions',
      severity: 'info',
      confidence: 'high',
      primarySource: first.source,
      evidence: [
        {
          kind: 'duplicate-instruction-block',
          message: `${first.source.file}:${first.source.line ?? 1} duplicates ${second.source.file}:${second.source.line ?? 1} (${first.nonEmptyLines} non-empty lines, ${first.normalized.length} normalized characters).`,
          source: first.source
        },
        {
          kind: 'duplicate-instruction-block',
          message: `${second.source.file}:${second.source.line ?? 1} contains the same normalized instruction block.`,
          source: second.source
        }
      ],
      suggestion: 'Keep the rule in one canonical place and reference it from narrower surfaces.'
    }
  ];
}

function countLines(content: string): number {
  return content.length === 0 ? 0 : content.split(/\r?\n/).length;
}

function stripFrontmatter(content: string): string {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return normalized;
  }

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) {
    return normalized;
  }

  const afterDelimiter = normalized[end + 4];
  if (afterDelimiter !== undefined && afterDelimiter !== '\n') {
    return normalized;
  }

  return normalized.slice(end + (afterDelimiter === '\n' ? 5 : 4));
}

function normalizeLine(line: string): string {
  return line.trim().replace(/^#{1,6}\s+/, '# ').replace(/\s+/g, ' ');
}
