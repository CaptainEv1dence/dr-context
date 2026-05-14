import { describe, expect, test } from 'vitest';
import { extractAgentInstructionDocs } from '../src/extractors/agentInstructionDocs.js';
import { getInstructionSurfaceForPath, instructionSurfaceGlobs } from '../src/extractors/instructionSurfaces.js';

describe('instruction surfaces', () => {
  test('matches official and planned agent instruction surfaces', () => {
    expect(getInstructionSurfaceForPath('AGENTS.md')).toMatchObject({ tool: 'agents', scope: 'repo' });
    expect(getInstructionSurfaceForPath('service/AGENTS.md')).toMatchObject({ tool: 'agents', scope: 'nested' });
    expect(getInstructionSurfaceForPath('CLAUDE.md')).toMatchObject({ tool: 'claude', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.github/copilot-instructions.md')).toMatchObject({ tool: 'copilot', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.github/instructions/api.instructions.md')).toMatchObject({ tool: 'copilot', scope: 'path' });
    expect(getInstructionSurfaceForPath('.cursor/rules/frontend.mdc')).toMatchObject({ tool: 'cursor', scope: 'nested' });
    expect(getInstructionSurfaceForPath('GEMINI.md')).toMatchObject({ tool: 'gemini', scope: 'repo' });
    expect(getInstructionSurfaceForPath('AGENT_GUIDE.md')).toMatchObject({ tool: 'unknown', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.windsurfrules')).toMatchObject({ tool: 'unknown', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.continue/rules/backend.md')).toMatchObject({ tool: 'unknown', scope: 'nested' });
    expect(getInstructionSurfaceForPath('.aider.conf.yml')).toMatchObject({ tool: 'unknown', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.sourcegraph/cody/context.md')).toMatchObject({ tool: 'unknown', scope: 'nested' });
  });

  test('exports globs for workspace discovery', () => {
    expect(instructionSurfaceGlobs).toEqual(
      expect.arrayContaining([
        'AGENTS.md',
        '**/AGENTS.md',
        'CLAUDE.md',
        '.github/copilot-instructions.md',
        '.github/instructions/**/*.instructions.md',
        '.cursor/rules/**/*.{md,mdc}',
        'GEMINI.md',
        'AGENT_GUIDE.md'
      ])
    );
  });

  test('extracts instruction docs with tool and scope metadata', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.github/copilot-instructions.md', content: '# Copilot\nRun `pnpm test`.' },
      { path: '.cursor/rules/frontend.mdc', content: '---\ndescription: Frontend rule\n---\nUse React.' },
      { path: 'GEMINI.md', content: '# Gemini' }
    ]);

    expect(docs).toEqual([
      expect.objectContaining({ path: '.github/copilot-instructions.md', tool: 'copilot', scope: 'repo' }),
      expect.objectContaining({ path: '.cursor/rules/frontend.mdc', tool: 'cursor', scope: 'nested' }),
      expect.objectContaining({ path: 'GEMINI.md', tool: 'gemini', scope: 'repo' })
    ]);
  });
});
