import { describe, expect, test } from 'vitest';
import { resolveEffectiveContext } from '../src/core/effectiveContext.js';
import type { AgentInstructionDocFact, RepoFacts } from '../src/core/types.js';

function doc(path: string, scope: AgentInstructionDocFact['scope'], extra: Partial<AgentInstructionDocFact> = {}): AgentInstructionDocFact {
  return {
    path,
    content: `# ${path}`,
    tool: path.includes('.cursor/') ? 'cursor' : 'agents',
    scope,
    source: { file: path, line: 1, text: `# ${path}` },
    ...extra
  };
}

function facts(agentInstructionDocs: AgentInstructionDocFact[], files = ['backend/src/api.ts']): RepoFacts {
  return {
    root: '/repo',
    packageManagers: [],
    scripts: [],
    buildTargets: [],
    runtimeVersions: [],
    commandMentions: [],
    ciCommands: [],
    workflowPrompts: [],
    architectureDocs: [],
    agentInstructionDocs,
    inheritedAgentInstructionDocs: [],
    localPathMentions: [],
    files: files.map((path) => ({ path, content: '' })),
    filePaths: files,
    keyDirectories: []
  };
}

describe('resolveEffectiveContext', () => {
  test('includes repo and target ancestry instructions for a path', () => {
    const context = resolveEffectiveContext(facts([
      doc('AGENTS.md', 'repo'),
      doc('backend/AGENTS.md', 'nested'),
      doc('frontend/AGENTS.md', 'nested')
    ]), { targetPath: 'backend/src/api.ts' });

    expect(context.targetPath).toBe('backend/src/api.ts');
    expect(context.instructionFiles.map((entry) => entry.path)).toEqual(['AGENTS.md', 'backend/AGENTS.md']);
    expect(context.instructionFiles[0]).toMatchObject({ inherited: false, appliesBecause: expect.stringContaining('repo-level') });
    expect(context.instructionFiles[1]).toMatchObject({ inherited: false, appliesBecause: expect.stringContaining('backend/') });
  });

  test('includes nested AGENTS.md for matching directory target', () => {
    const context = resolveEffectiveContext(facts([
      doc('AGENTS.md', 'repo'),
      doc('backend/AGENTS.md', 'nested'),
      doc('frontend/AGENTS.md', 'nested')
    ], ['backend/src/api.ts']), { targetPath: 'backend' });

    expect(context.instructionFiles.map((entry) => entry.path)).toEqual(['AGENTS.md', 'backend/AGENTS.md']);
  });

  test('includes inherited parent instructions only when requested', () => {
    const parent = doc('AGENTS.md', 'repo', { inherited: true, inheritedFrom: 'workspace-parent', displayPath: '<workspace-parent>/AGENTS.md' });
    const childFacts = facts([doc('AGENTS.md', 'repo')], ['src/index.ts']);

    expect(resolveEffectiveContext(childFacts, { targetPath: 'src/index.ts' }).instructionFiles.map((entry) => entry.path)).toEqual(['AGENTS.md']);

    const context = resolveEffectiveContext(childFacts, {
      targetPath: 'src/index.ts',
      includeInherited: true,
      parentInstructionFiles: [parent]
    });

    expect(context.instructionFiles).toEqual([
      expect.objectContaining({ path: 'AGENTS.md', inherited: true, inheritedFrom: 'workspace-parent' }),
      expect.objectContaining({ path: 'AGENTS.md', inherited: false })
    ]);
  });

  test('adds parent provenance to raw inherited instruction facts', () => {
    const context = resolveEffectiveContext(facts([doc('AGENTS.md', 'repo')], ['src/index.ts']), {
      targetPath: 'src/index.ts',
      includeInherited: true,
      parentInstructionFiles: [doc('docs/AGENTS.md', 'nested')]
    });

    expect(context.instructionFiles[0]).toMatchObject({
      path: 'docs/AGENTS.md',
      inherited: true,
      inheritedFrom: 'workspace-parent',
      displayPath: '<workspace-parent>/docs/AGENTS.md'
    });
  });

  test('includes cursor alwaysApply rules for every target path', () => {
    const context = resolveEffectiveContext(facts([
      doc('AGENTS.md', 'repo'),
      doc('.cursor/rules/global.mdc', 'nested', { metadata: { alwaysApply: true } }),
      doc('.cursor/rules/manual.mdc', 'nested', { metadata: { alwaysApply: false } })
    ]), { targetPath: 'backend/src/api.ts' });

    expect(context.instructionFiles.map((entry) => entry.path)).toEqual(['AGENTS.md', '.cursor/rules/global.mdc']);
    expect(context.instructionFiles[1].appliesBecause).toContain('alwaysApply=true');
  });

  test('includes cursor rules when appliesTo glob matches target path', () => {
    const context = resolveEffectiveContext(facts([
      doc('AGENTS.md', 'repo'),
      doc('.cursor/rules/backend.mdc', 'nested', { appliesTo: ['backend/**'] }),
      doc('.cursor/rules/frontend.mdc', 'nested', { appliesTo: ['frontend/**'] })
    ]), { targetPath: 'backend/src/api.ts' });

    expect(context.instructionFiles.map((entry) => entry.path)).toEqual(['AGENTS.md', '.cursor/rules/backend.mdc']);
  });
});
