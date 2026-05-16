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
    expect(getInstructionSurfaceForPath('.github/agents/release-agent.agent.md')).toMatchObject({ tool: 'copilot', scope: 'repo' });
    expect(getInstructionSurfaceForPath('AGENTS.override.md')).toMatchObject({ tool: 'agents', scope: 'repo' });
    expect(getInstructionSurfaceForPath('CLAUDE.local.md')).toMatchObject({ tool: 'claude', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.junie/guidelines.md')).toMatchObject({ tool: 'unknown', scope: 'repo' });
    expect(getInstructionSurfaceForPath('JULES.md')).toMatchObject({ tool: 'unknown', scope: 'repo' });
    expect(getInstructionSurfaceForPath('.claude/skills/release/SKILL.md')).toMatchObject({ tool: 'claude', scope: 'nested' });
    expect(getInstructionSurfaceForPath('.mcp.json')).toBeUndefined();
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
        'AGENT_GUIDE.md',
        '.github/agents/*.agent.md',
        'AGENTS.override.md',
        'CLAUDE.local.md',
        '.junie/guidelines.md',
        'JULES.md',
        '.claude/skills/**/SKILL.md'
      ])
    );
    expect(instructionSurfaceGlobs).not.toContain('.mcp.json');
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

  test('extracts Cursor frontmatter list syntax globs', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/backend.mdc', content: '---\nglobs:\n  - backend/**/*.ts\n  - shared/**/*.ts\n---\nUse backend patterns.' }
    ]);

    expect(docs[0]).toMatchObject({
      appliesTo: ['backend/**/*.ts', 'shared/**/*.ts'],
      metadata: { scopedRule: true }
    });
  });

  test('extracts Cursor frontmatter inline array globs', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/frontend.md', content: '---\nglobs: [frontend/**/*.tsx, app/**/*.tsx]\n---\nUse frontend patterns.' }
    ]);

    expect(docs[0]).toMatchObject({
      appliesTo: ['frontend/**/*.tsx', 'app/**/*.tsx'],
      metadata: { scopedRule: true }
    });
  });

  test('extracts Cursor frontmatter scalar string paths and globs', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/path.mdc', content: '---\npaths: backend/src/api.ts\n---\nUse API patterns.' },
      { path: '.cursor/rules/glob.mdc', content: '---\nglobs: backend/**/*.ts\n---\nUse backend patterns.' }
    ]);

    expect(docs).toEqual([
      expect.objectContaining({ appliesTo: ['backend/src/api.ts'], metadata: { scopedRule: true } }),
      expect.objectContaining({ appliesTo: ['backend/**/*.ts'], metadata: { scopedRule: true } })
    ]);
  });

  test('returns no Cursor metadata for malformed frontmatter', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/bad.mdc', content: '---\nglobs: [backend/**/*.ts\n---\nUse backend patterns.' }
    ]);

    expect(docs[0]).not.toHaveProperty('appliesTo');
    expect(docs[0]).not.toHaveProperty('metadata');
  });

  test('ignores non-string Cursor frontmatter values', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/mixed.mdc', content: '---\nglobs:\n  - backend/**/*.ts\n  - 42\n  - false\npaths:\n  - frontend/src/App.tsx\n  - nested: value\n---\nUse scoped patterns.' }
    ]);

    expect(docs[0]).toMatchObject({
      appliesTo: ['backend/**/*.ts', 'frontend/src/App.tsx'],
      metadata: { scopedRule: true }
    });
  });

  test('extracts Cursor frontmatter alwaysApply true and false', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.cursor/rules/global.mdc', content: '---\nalwaysApply: true\n---\nUse global patterns.' },
      { path: '.cursor/rules/manual.mdc', content: '---\nalwaysApply: false\n---\nUse manual patterns.' }
    ]);

    expect(docs).toEqual([
      expect.objectContaining({ metadata: { scopedRule: true, alwaysApply: true } }),
      expect.objectContaining({ metadata: { scopedRule: true, alwaysApply: false } })
    ]);
  });

  test('keeps non-Cursor instruction docs unchanged when frontmatter is present', () => {
    const docs = extractAgentInstructionDocs([
      { path: '.github/copilot-instructions.md', content: '---\nglobs: [backend/**/*.ts]\nalwaysApply: true\n---\nUse Copilot patterns.' }
    ]);

    expect(docs[0]).toMatchObject({ path: '.github/copilot-instructions.md', tool: 'copilot', scope: 'repo' });
    expect(docs[0]).not.toHaveProperty('appliesTo');
    expect(docs[0]).not.toHaveProperty('metadata');
  });
});
