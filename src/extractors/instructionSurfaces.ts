import type { AgentInstructionScope, AgentInstructionTool } from '../core/types.js';

export type InstructionSurfaceDefinition = {
  id: string;
  tool: AgentInstructionTool;
  scope: AgentInstructionScope;
  patterns: RegExp[];
  globs: string[];
};

export const instructionSurfaces: InstructionSurfaceDefinition[] = [
  { id: 'agents-root', tool: 'agents', scope: 'repo', patterns: [/^AGENTS\.md$/i], globs: ['AGENTS.md'] },
  { id: 'agents-nested', tool: 'agents', scope: 'nested', patterns: [/^.+\/AGENTS\.md$/i], globs: ['**/AGENTS.md'] },
  { id: 'claude', tool: 'claude', scope: 'repo', patterns: [/^CLAUDE\.md$/i], globs: ['CLAUDE.md'] },
  { id: 'cursor-legacy', tool: 'cursor', scope: 'repo', patterns: [/^\.cursorrules$/i], globs: ['.cursorrules'] },
  { id: 'cursor-rules', tool: 'cursor', scope: 'nested', patterns: [/^\.cursor\/rules\/.+\.(?:md|mdc)$/i], globs: ['.cursor/rules/**/*.{md,mdc}'] },
  { id: 'copilot-repo', tool: 'copilot', scope: 'repo', patterns: [/^\.github\/copilot-instructions\.md$/i], globs: ['.github/copilot-instructions.md'] },
  { id: 'copilot-path', tool: 'copilot', scope: 'path', patterns: [/^\.github\/instructions\/.+\.instructions\.md$/i], globs: ['.github/instructions/**/*.instructions.md'] },
  { id: 'gemini', tool: 'gemini', scope: 'repo', patterns: [/^GEMINI\.md$/i], globs: ['GEMINI.md'] },
  { id: 'agent-guide', tool: 'unknown', scope: 'repo', patterns: [/^AGENT_GUIDE\.md$/i], globs: ['AGENT_GUIDE.md'] },
  { id: 'windsurf', tool: 'unknown', scope: 'repo', patterns: [/^\.windsurfrules$/i], globs: ['.windsurfrules'] },
  { id: 'continue', tool: 'unknown', scope: 'nested', patterns: [/^\.continue\/rules\/.+\.(?:md|mdc)$/i], globs: ['.continue/rules/**/*.{md,mdc}'] },
  { id: 'aider', tool: 'unknown', scope: 'repo', patterns: [/^\.aider\.conf\.ya?ml$/i], globs: ['.aider.conf.yml', '.aider.conf.yaml'] },
  { id: 'cody', tool: 'unknown', scope: 'nested', patterns: [/^\.sourcegraph\/cody\/.+\.md$/i], globs: ['.sourcegraph/cody/**/*.md'] }
];

export const instructionSurfaceGlobs = [...new Set(instructionSurfaces.flatMap((surface) => surface.globs))];

export function getInstructionSurfaceForPath(path: string): InstructionSurfaceDefinition | undefined {
  const normalized = path.replace(/\\/g, '/');
  return instructionSurfaces.find((surface) => surface.patterns.some((pattern) => pattern.test(normalized)));
}
