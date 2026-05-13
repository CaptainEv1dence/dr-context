import type { AgentInstructionDocFact, RawFile } from '../core/types.js';

export function extractAgentInstructionDocs(files: RawFile[]): AgentInstructionDocFact[] {
  return files.flatMap((file) => {
    if (!isAgentInstructionPath(file.path)) {
      return [];
    }

    return [
      {
        path: file.path,
        content: file.content,
        source: {
          file: file.path,
          line: 1,
          text: file.content.split('\n')[0]?.trim() ?? ''
        }
      }
    ];
  });
}

function isAgentInstructionPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized === 'agents.md' ||
    normalized === 'claude.md' ||
    normalized === '.cursorrules' ||
    normalized.startsWith('.cursor/rules/') ||
    normalized === '.github/copilot-instructions.md' ||
    normalized.startsWith('.github/instructions/')
  );
}
