import type { AgentInstructionDocFact, RawFile } from '../core/types.js';
import { getInstructionSurfaceForPath } from './instructionSurfaces.js';

export function extractAgentInstructionDocs(files: RawFile[]): AgentInstructionDocFact[] {
  return files.flatMap((file) => {
    const surface = getInstructionSurfaceForPath(file.path);
    if (!surface) {
      return [];
    }

    return [
      {
        path: file.path,
        content: file.content,
        tool: surface.tool,
        scope: surface.scope,
        source: {
          file: file.path,
          line: 1,
          text: file.content.split('\n')[0]?.trim() ?? ''
        }
      }
    ];
  });
}
