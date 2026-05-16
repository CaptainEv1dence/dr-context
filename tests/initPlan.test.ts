import { describe, expect, test } from 'vitest';
import { planInit } from '../src/init/initPlan.js';
import type { RawFile } from '../src/core/types.js';

function file(path: string, content = ''): RawFile {
  return { path, content };
}

describe('init plan', () => {
  test('plans config and AGENTS.md when both are missing', () => {
    const plan = planInit([]);

    expect(plan.files).toEqual([
      expect.objectContaining({ path: '.drctx.json', action: 'create' }),
      expect.objectContaining({ path: 'AGENTS.md', action: 'create' })
    ]);
    expect(plan.files.every((entry) => entry.reason.length > 0)).toBe(true);
  });

  test('skips .drctx.json when config already exists', () => {
    const plan = planInit([file('.drctx.json', '{}')]);

    expect(plan.files).toEqual([
      expect.objectContaining({ path: '.drctx.json', action: 'skip', reason: 'already exists' }),
      expect.objectContaining({ path: 'AGENTS.md', action: 'create' })
    ]);
  });

  test('skips AGENTS.md when any recognized instruction surface exists', () => {
    const plan = planInit([file('CLAUDE.md', '# Existing instructions')]);

    expect(plan.files).toEqual([
      expect.objectContaining({ path: '.drctx.json', action: 'create' }),
      expect.objectContaining({ path: 'AGENTS.md', action: 'skip', reason: 'recognized instruction surface exists' })
    ]);
  });

  test('skips AGENTS.md when a nested recognized instruction surface exists', () => {
    const plan = planInit([file('service/AGENTS.md', '# Service instructions')]);

    expect(plan.files).toEqual([
      expect.objectContaining({ path: '.drctx.json', action: 'create' }),
      expect.objectContaining({ path: 'AGENTS.md', action: 'skip', reason: 'recognized instruction surface exists' })
    ]);
  });

  test('templates are generic and do not contain local machine paths, schema URLs, or secrets', () => {
    const plan = planInit([]);
    const combined = plan.files.map((entry) => entry.content ?? '').join('\n');

    expect(combined).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
    expect(combined).not.toMatch(/\$schema/);
    expect(combined).not.toMatch(/password|api[_-]?key|Bearer [A-Za-z0-9._-]+|npm_[A-Za-z0-9]/i);
    expect(combined).toContain('corepack pnpm test');
    expect(combined).toContain('corepack pnpm run typecheck');
    expect(combined).toContain('corepack pnpm run lint');
  });
});
