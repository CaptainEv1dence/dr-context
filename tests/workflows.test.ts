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
    expect(workflow).toContain('publish_results: false');
    expect(workflow).not.toContain('id-token: write');
  });

  test('enforces self-dogfood in CI and release workflows', async () => {
    const ci = await readFile(join(workflowsRoot, 'ci.yml'), 'utf8');
    const release = await readFile(join(workflowsRoot, 'release.yml'), 'utf8');

    expect(ci).toContain('node dist/cli/main.js check --json --root .');
    expect(release).toContain('node dist/cli/main.js check --json --root .');
  });

  test('release workflow rejects tag and package version mismatches', async () => {
    const release = await readFile(join(workflowsRoot, 'release.yml'), 'utf8');

    expect(release).toContain('TAG_VERSION="${GITHUB_REF_NAME#v}"');
    expect(release).toContain('Package version $PKG_VERSION does not match tag $GITHUB_REF_NAME');
  });
});
