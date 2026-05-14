import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const workflowsRoot = join(import.meta.dirname, '..', '.github', 'workflows');

describe('GitHub workflows', () => {
  test('runs OpenSSF Scorecard with minimal read-only permissions', async () => {
    const workflow = await readFile(join(workflowsRoot, 'scorecard.yml'), 'utf8');

    expect(workflow).toContain('ossf/scorecard-action');
    expect(workflow).toContain('security-events: write');
    expect(workflow).toContain('contents: read');
  });
});
