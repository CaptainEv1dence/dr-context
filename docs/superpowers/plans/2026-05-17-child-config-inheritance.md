# Child Config Inheritance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workspace scans apply each candidate root's own `.drctx.json` while preserving safe parent defaults and existing direct-root behavior.

**Architecture:** Keep config loading in `src/config/loadConfig.ts` and make workspace-specific config resolution explicit. Direct `drctx check --root packages/app` continues to load only that root's config, or the explicit `--config` path. Workspace scans load the workspace root config once, then derive a candidate config for each discovered root by merging root defaults with the candidate's own `.drctx.json` when present.

**Tech Stack:** TypeScript, Commander CLI, Node `fs/promises` and `path`, Vitest, existing config/baseline/suppression types.

---

## Plan review amendments

These rules supersede any conflicting task text below.

1. Do not add network, LLM, or write behavior. Workspace config inheritance is read-only analysis configuration.
2. Do not change report schema versions in this slice. Keep `drctx.report.v1` and `drctx.workspace-report.v1`.
3. Do not change SARIF, finding IDs, health math, or exit-code semantics.
4. Direct scans keep the existing contract: load `.drctx.json` from `--root`, or the explicit `--config` path. Direct scans do not walk upward to find parent configs.
5. Explicit `--config` remains authoritative. In workspace mode, if `--config` is passed, use that config for every candidate and do not auto-load child configs.
6. Workspace auto child config applies only for default root `.drctx.json` discovery, not for explicit `--config`.
7. Parent config defaults apply to child candidates only for keys where the child config is silent. Child config overrides scalar/list/resource keys by replacement, not concatenation.
8. Baseline files remain scoped by candidate path. A root baseline suppresses findings only for the `.` candidate unless its `baseline` path points into a child candidate path, preserving current ownership behavior.
9. Suppressions from root and child configs should both apply to child scans. Child suppressions are additive because suppressions are safety valves, not scan-shaping defaults.
10. If a child `.drctx.json` is invalid, workspace scan must exit with code `2` and include a usage error naming the candidate-relative config path. Do not silently skip invalid child config.
11. Child config values are evaluated relative to the candidate root because `runScan()` receives the candidate root. Do not rebase child `include`, `exclude`, suppression `file`, or `baseline` paths to the workspace root before scanning a child candidate.
12. Parent baselines do not inherit into child candidates. A child candidate uses its own child baseline if present; otherwise it has no baseline-derived suppressions. Root suppressions still apply to child candidates.

---

## Merge semantics

Workspace mode, no explicit `--config`:

| Key | Parent applies to child? | Child behavior |
| --- | --- | --- |
| `include` | Yes | Child replaces parent when defined. |
| `exclude` | Yes | Child replaces parent when defined. |
| `strict` | Yes | Child replaces parent when defined. |
| `maxFiles` / `maxFileBytes` / `maxTotalBytes` | Yes | Child replaces each limit when defined. Missing child limit keeps parent value. |
| `suppressions` | Yes | Child suppressions append after parent suppressions. |
| `baseline` | No automatic parent inheritance | Root baseline applies only to `.`. Child baseline applies only to that child candidate and stays relative to the child root. |

Direct mode:

- `drctx check --root packages/app` loads only `packages/app/.drctx.json` by default.
- `drctx check --root packages/app --config ../repo/.drctx.json` remains rejected because config paths must stay inside `--root`.

Workspace mode, explicit `--config`:

- `drctx check --workspace --root . --config .drctx.json` uses `.drctx.json` for every candidate.
- No candidate `.drctx.json` files are auto-loaded in this mode.

---

## File structure

### Create

- `src/config/mergeConfig.ts`  
  Pure merge helpers for parent and child loaded configs.
- `src/config/workspaceConfig.ts`  
  Workspace-only config resolver that loads candidate `.drctx.json` files and returns an effective config per candidate.
- `tests/workspaceConfig.test.ts`  
  Unit tests for merge rules and candidate config loading.

### Modify

- `src/config/loadConfig.ts`  
  Export a small helper for loading config from a known root without changing existing direct-scan behavior.
- `src/config/types.ts`  
  Add optional config source metadata if needed by tests and errors.
- `src/core/workspaceScan.ts`  
  Use per-candidate effective configs before calling `runScan`.
- `src/cli/main.ts`  
  Pass explicit-config intent into workspace scanning so child auto-loading is disabled when `--config` is set.
- `tests/config.test.ts`  
  Add regression coverage that direct scans do not inherit parent config.
- `tests/cli.test.ts`  
  Add workspace integration coverage for child exclude, child strict, explicit `--config`, invalid child config, and child suppressions.
- `README.md`  
  Update workspace limitation text after implementation.
- `docs/roadmap.md`  
  Move child config inheritance from Next/Later to Shipped after implementation.
- `docs/superpowers/README.md`  
  Point Current at this plan during implementation.

---

## Task 1: Pure config merge helpers

**Files:**
- Create: `src/config/mergeConfig.ts`
- Create: `tests/workspaceConfig.test.ts`

- [ ] **Step 1: Write failing merge tests**

Create `tests/workspaceConfig.test.ts` with these initial tests:

```ts
import { describe, expect, test } from 'vitest';
import { mergeWorkspaceChildConfig } from '../src/config/mergeConfig.js';
import type { LoadedConfig } from '../src/config/types.js';

function config(input: Partial<LoadedConfig>): LoadedConfig {
  return { suppressions: [], ...input };
}

describe('workspace child config merging', () => {
  test('uses parent values when child is silent', () => {
    const parent = config({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
    const child = config({});

    expect(mergeWorkspaceChildConfig(parent, child)).toMatchObject({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
  });

  test('lets child replace include, exclude, strict, and individual resource limits', () => {
    const parent = config({
      include: ['AGENTS.md'],
      exclude: ['dist/**'],
      strict: false,
      resourceLimits: { maxFiles: 100, maxFileBytes: 2000, maxTotalBytes: 3000 }
    });
    const child = config({
      include: ['package.json'],
      exclude: ['vendor/**'],
      strict: true,
      resourceLimits: { maxFileBytes: 4000 }
    });

    expect(mergeWorkspaceChildConfig(parent, child)).toMatchObject({
      include: ['package.json'],
      exclude: ['vendor/**'],
      strict: true,
      resourceLimits: { maxFiles: 100, maxFileBytes: 4000, maxTotalBytes: 3000 }
    });
  });

  test('appends child suppressions after parent suppressions', () => {
    const parent = config({ suppressions: [{ id: 'parent-rule', file: 'AGENTS.md' }] });
    const child = config({ suppressions: [{ id: 'child-rule', file: 'package.json' }] });

    expect(mergeWorkspaceChildConfig(parent, child).suppressions).toEqual([
      { id: 'parent-rule', file: 'AGENTS.md' },
      { id: 'child-rule', file: 'package.json' }
    ]);
  });

  test('does not inherit parent baseline into child candidates', () => {
    const parent = config({ baselinePath: '.drctx-baseline.json' });
    const child = config({});

    expect(mergeWorkspaceChildConfig(parent, child).baselinePath).toBeUndefined();
  });

  test('keeps child baseline when child defines one', () => {
    const parent = config({ baselinePath: '.drctx-baseline.json' });
    const child = config({ baselinePath: '.drctx-baseline.json' });

    expect(mergeWorkspaceChildConfig(parent, child).baselinePath).toBe('.drctx-baseline.json');
  });
});
```

- [ ] **Step 2: Run the failing merge tests**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts
```

Expected: FAIL because `src/config/mergeConfig.ts` does not exist.

- [ ] **Step 3: Implement the merge helper**

Create `src/config/mergeConfig.ts`:

```ts
import type { LoadedConfig } from './types.js';

export function mergeWorkspaceChildConfig(parent: LoadedConfig, child: LoadedConfig): LoadedConfig {
  const mergedResourceLimits = mergeResourceLimits(parent.resourceLimits, child.resourceLimits);
  const baselinePath = child.baselinePath;
  const baseline = child.baseline;

  return {
    include: child.include ?? parent.include,
    exclude: child.exclude ?? parent.exclude,
    strict: child.strict ?? parent.strict,
    suppressions: [...(parent.suppressions ?? []), ...(child.suppressions ?? [])],
    resourceLimits: mergedResourceLimits,
    ...(baselinePath ? { baselinePath } : {}),
    ...(baseline ? { baseline } : {})
  };
}

function mergeResourceLimits(
  parent: LoadedConfig['resourceLimits'],
  child: LoadedConfig['resourceLimits']
): LoadedConfig['resourceLimits'] {
  if (!parent && !child) {
    return undefined;
  }

  return {
    ...(parent ?? {}),
    ...(child ?? {})
  };
}
```

- [ ] **Step 4: Run the merge tests and fix the baseline expectation if needed**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add src/config/mergeConfig.ts tests/workspaceConfig.test.ts
git commit -m "feat: merge workspace child config"
```

---

## Task 2: Workspace candidate config resolver

**Files:**
- Modify: `src/config/loadConfig.ts`
- Create: `src/config/workspaceConfig.ts`
- Modify: `tests/workspaceConfig.test.ts`

- [ ] **Step 1: Add failing resolver tests**

Append to `tests/workspaceConfig.test.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadWorkspaceCandidateConfig } from '../src/config/workspaceConfig.js';

async function makeRepo(files: Record<string, string>): Promise<string> {
  const root = join(tmpdir(), `drctx-workspace-config-${crypto.randomUUID()}`);
  await mkdir(root, { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(root, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe('loadWorkspaceCandidateConfig', () => {
  test('loads and merges child .drctx.json for workspace candidates', async () => {
    const root = await makeRepo({
      '.drctx.json': JSON.stringify({ exclude: ['dist/**'], strict: false, maxFiles: 100 }),
      'packages/app/.drctx.json': JSON.stringify({ exclude: ['vendor/**'], strict: true, maxFileBytes: 2048 })
    });
    const parent = config({ exclude: ['dist/**'], strict: false, resourceLimits: { maxFiles: 100 } });

    const result = await loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: false });

    expect(result.config.exclude).toEqual(['vendor/**']);
    expect(result.config.strict).toBe(true);
    expect(result.config.resourceLimits).toEqual({ maxFiles: 100, maxFileBytes: 2048 });
    expect(result.loadedChildConfigPath).toBe('packages/app/.drctx.json');
  });

  test('does not load child config when explicit --config is active', async () => {
    const root = await makeRepo({
      'packages/app/.drctx.json': JSON.stringify({ strict: true })
    });
    const parent = config({ strict: false });

    const result = await loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: true });

    expect(result.config.strict).toBe(false);
    expect(result.loadedChildConfigPath).toBeUndefined();
  });

  test('reports invalid child config with a candidate-relative path', async () => {
    const root = await makeRepo({
      'packages/app/.drctx.json': '{'
    });
    const parent = config({});

    await expect(loadWorkspaceCandidateConfig(root, 'packages/app', parent, { explicitConfig: false })).rejects.toThrow(
      'packages/app/.drctx.json'
    );
  });
});
```

- [ ] **Step 2: Run resolver tests and verify failure**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts
```

Expected: FAIL because `src/config/workspaceConfig.ts` does not exist.

- [ ] **Step 3: Export a root-local optional config loader**

Modify `src/config/loadConfig.ts` by adding this exported helper below `loadConfig`:

```ts
export async function loadOptionalConfigAtRoot(root: string): Promise<LoadedConfig | undefined> {
  const resolvedRoot = resolve(root);
  const raw = await readOptionalJson(resolve(resolvedRoot, '.drctx.json'), false);
  if (raw === undefined) {
    return undefined;
  }

  const config = validateConfig(raw);
  const baseline = config.baselinePath ? await loadBaseline(resolvedRoot, config.baselinePath) : undefined;
  return baseline ? { ...config, baseline } : config;
}
```

Do not change `loadConfig` behavior.

- [ ] **Step 4: Implement workspace config resolver**

Create `src/config/workspaceConfig.ts`:

```ts
import { join } from 'node:path';
import { ConfigUsageError, loadOptionalConfigAtRoot } from './loadConfig.js';
import { mergeWorkspaceChildConfig } from './mergeConfig.js';
import type { LoadedConfig } from './types.js';

export type WorkspaceCandidateConfigResult = {
  config: LoadedConfig;
  loadedChildConfigPath?: string;
};

export async function loadWorkspaceCandidateConfig(
  workspaceRoot: string,
  candidatePath: string,
  parentConfig: LoadedConfig,
  options: { explicitConfig: boolean }
): Promise<WorkspaceCandidateConfigResult> {
  if (candidatePath === '.' || options.explicitConfig) {
    return { config: parentConfig };
  }

  const childRoot = join(workspaceRoot, candidatePath);
  try {
    const childConfig = await loadOptionalConfigAtRoot(childRoot);
    if (!childConfig) {
      return { config: parentConfig };
    }

    return {
      config: mergeWorkspaceChildConfig(parentConfig, childConfig),
      loadedChildConfigPath: `${candidatePath}/.drctx.json`
    };
  } catch (error) {
    if (error instanceof ConfigUsageError) {
      throw new ConfigUsageError(`${candidatePath}/.drctx.json: ${error.message}`);
    }
    throw error;
  }
}

```

- [ ] **Step 5: Run resolver tests and verify pass**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts tests/config.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add src/config/loadConfig.ts src/config/workspaceConfig.ts tests/workspaceConfig.test.ts
git commit -m "feat: load workspace child config"
```

---

## Task 3: Apply per-candidate configs in workspace scans

**Files:**
- Modify: `src/core/workspaceScan.ts`
- Modify: `src/cli/main.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add failing CLI tests for workspace child config**

Append tests inside the `describe('drctx CLI', () => { ... })` block in `tests/cli.test.ts` before the final closing `});`:

```ts
  test('workspace scans apply child exclude config to candidate roots', async () => {
    const root = await makeSyntheticRepo({
      'packages/app/package.json': JSON.stringify({ scripts: { test: 'vitest' } }),
      'packages/app/AGENTS.md': '# App instructions\nRun test:unit.\n',
      'packages/app/.drctx.json': JSON.stringify({ exclude: ['AGENTS.md'] })
    });

    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--json', '--root', root, '--max-depth', '3']);
    const output = JSON.parse(result.stdout);
    const app = output.reports.find((entry: { path: string }) => entry.path === 'packages/app');

    expect(result.exitCode).toBe(0);
    expect(app.report.findings.map((finding: { id: string }) => finding.id)).not.toContain('stale-package-script-reference');
  });

  test('workspace scans use child strict config for exit codes', async () => {
    const root = await makeSyntheticRepo({
      'packages/app/package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', scripts: { lint: 'eslint .' } }),
      'packages/app/AGENTS.md': '# App instructions\nRun tests with pnpm test.\n',
      'packages/app/.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: pnpm lint\n',
      'packages/app/.drctx.json': JSON.stringify({ strict: true })
    });

    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--root', root, '--max-depth', '3']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('packages/app: 0 error(s), 1 warning(s), 0 info(s)');
  });

  test('workspace scans keep explicit --config authoritative over child config', async () => {
    const root = await makeSyntheticRepo({
      '.drctx.json': JSON.stringify({ strict: false }),
      'packages/app/package.json': JSON.stringify({ packageManager: 'pnpm@11.1.1', scripts: { lint: 'eslint .' } }),
      'packages/app/AGENTS.md': '# App instructions\nRun tests with pnpm test.\n',
      'packages/app/.github/workflows/ci.yml': 'jobs:\n  test:\n    steps:\n      - run: pnpm lint\n',
      'packages/app/.drctx.json': JSON.stringify({ strict: true })
    });

    const result = await runCli([
      'node',
      'drctx',
      'check',
      '--workspace',
      '--config',
      '.drctx.json',
      '--root',
      root,
      '--max-depth',
      '3'
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('packages/app: 0 error(s), 1 warning(s), 0 info(s)');
  });

  test('workspace scans report invalid child config as usage error', async () => {
    const root = await makeSyntheticRepo({
      'packages/app/package.json': '{}',
      'packages/app/.drctx.json': '{'
    });

    const result = await runCli(['node', 'drctx', 'check', '--workspace', '--root', root, '--max-depth', '3']);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('Dr. Context usage error');
    expect(result.stderr).toContain('packages/app/.drctx.json');
  });
```

- [ ] **Step 2: Run CLI tests and verify they fail**

Run:

```powershell
corepack pnpm exec vitest run tests/cli.test.ts
```

Expected: FAIL because workspace scans still use one root config for every candidate.

- [ ] **Step 3: Extend workspace scan options**

Modify `src/core/workspaceScan.ts` import section:

```ts
import { join } from 'node:path';
import type { LoadedConfig } from '../config/types.js';
import { loadWorkspaceCandidateConfig } from '../config/workspaceConfig.js';
```

Change the function signature:

```ts
export async function runWorkspaceScan(
  root: string,
  config: EffectiveConfig & LoadedConfig & { maxDepth: number; explicitConfig?: boolean }
): Promise<WorkspaceReport> {
```

- [ ] **Step 4: Load candidate config inside workspace scan**

Replace the `mapWithConcurrency` callback in `src/core/workspaceScan.ts` with:

```ts
  const reports = await mapWithConcurrency(discovery.candidates, defaultWorkspaceScanConcurrency, async (candidate) => {
    const candidateConfig = await loadWorkspaceCandidateConfig(root, candidate.path, config, { explicitConfig: Boolean(config.explicitConfig) });
    const effectiveCandidateConfig = candidateConfig.config;
    const report = await runScan(candidate.path === '.' ? root : join(root, candidate.path), {
      ...effectiveCandidateConfig,
      strict: Boolean(effectiveCandidateConfig.strict),
      include: effectiveCandidateConfig.include ?? [],
      exclude: effectiveCandidateConfig.exclude ?? [],
      resourceLimits: effectiveCandidateConfig.resourceLimits,
      inheritedAgentInstructionDocs: candidate.path === '.' || !config.inheritParentInstructions ? [] : parentDocs,
      parentAgentInstructionDocs: candidate.path === '.' || config.inheritParentInstructions ? undefined : parentDocs
    });
    const suppressions = [...(effectiveCandidateConfig.suppressions ?? []), ...baselineSuppressionsFromConfig(effectiveCandidateConfig)];
    return {
      path: candidate.path,
      report: withSuppressionResult(report, applySuppressions(report.findings, suppressions))
    };
  });
```

Add helper near the bottom of the file:

```ts
function baselineSuppressionsFromConfig(config: LoadedConfig) {
  return (
    config.baseline?.findings.map((entry) => ({
      id: entry.id,
      file: entry.file,
      fingerprint: entry.fingerprint,
      reason: entry.reason
    })) ?? []
  );
}
```

- [ ] **Step 5: Pass explicit config intent from CLI**

Modify the workspace branch in `src/cli/main.ts`. Replace the `runWorkspaceScan(root, { ... })` argument object with:

```ts
          const report = await runWorkspaceScan(root, {
            ...loadedConfig,
            strict: scanConfig.strict,
            include: scanConfig.include,
            exclude: scanConfig.exclude,
            resourceLimits: scanConfig.resourceLimits,
            maxDepth,
            inheritParentInstructions: Boolean(effectiveOptions.inheritParentInstructions),
            explicitConfig: Boolean(effectiveOptions.config)
          });
```

Remove the old `workspaceBaselineSuppressions: workspaceBaselineSuppressionsFromConfig(loadedConfig),` line from this object.

Then delete the `workspaceBaselineSuppressionsFromConfig` helper from `src/cli/main.ts` if it is no longer used.

- [ ] **Step 6: Run targeted CLI tests**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts tests/cli.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Run:

```powershell
git add src/core/workspaceScan.ts src/cli/main.ts tests/cli.test.ts
git commit -m "feat: apply child config in workspace scans"
```

---

## Task 4: Docs and current-context index

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/README.md`

- [ ] **Step 1: Update README workspace config docs**

In `README.md`, replace this sentence:

```md
Workspace limitation: the root config is shared across workspace candidates. A baseline entry only applies to findings owned by that candidate path, and child config inheritance is not implemented yet.
```

with:

```md
Workspace config: when `drctx check --workspace` discovers package roots, each candidate can use its own `.drctx.json`. Root config values provide defaults for child candidates, child configs replace include/exclude/strict/resource limits when set, and suppressions are additive. Explicit `--config` remains authoritative and is used for every candidate.
```

- [ ] **Step 2: Update roadmap**

In `docs/roadmap.md`, add this under `## Shipped` after the 0.3.13 entry once implementation is complete:

```md
- 0.3.14 child config inheritance:
  - Workspace scans load candidate `.drctx.json` files when no explicit `--config` is passed.
  - Root config values provide defaults for child candidates, while child configs can replace include/exclude/strict/resource limits.
  - Root and child suppressions are additive, and baseline ownership remains candidate-scoped.
```

Remove any duplicate child config inheritance line from `## Next` or `## Later` if this implementation closes it.

- [ ] **Step 3: Update superpowers current index**

Modify `docs/superpowers/README.md` to make this plan current:

```md
## Current

- Active plan: `docs/superpowers/plans/2026-05-17-child-config-inheritance.md`
- Active spec: `docs/superpowers/specs/2026-05-16-child-config-and-cross-agent-drift-design.md`
```

Add the init plan to Done:

```md
- `docs/superpowers/plans/2026-05-16-drctx-init.md` shipped in `dr-context@0.3.13`.
```

Update Agent guidance to say:

```md
- Start with the active plan for child config inheritance work.
```

- [ ] **Step 4: Run docs-related checks**

Run:

```powershell
corepack pnpm exec vitest run tests/readmeCompleteness.test.ts tests/docsReference.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add README.md docs/roadmap.md docs/superpowers/README.md
git commit -m "docs: document workspace child config"
```

---

## Task 5: Full verification and privacy gate

**Files:**
- No source files unless verification finds a defect.
- Update Obsidian only through Obsidian CLI after source verification.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
corepack pnpm exec vitest run tests/workspaceConfig.test.ts tests/cli.test.ts tests/config.test.ts tests/readmeCompleteness.test.ts tests/docsReference.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test/type/lint/build gate**

Run:

```powershell
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
```

Expected: all pass. Package dry-run should show the current package version and include new `dist/config/mergeConfig.*` and `dist/config/workspaceConfig.*` files.

- [ ] **Step 3: Run Dr. Context self-scan and parse findings length**

Run:

```powershell
$selfScanJson = node dist/cli/main.js check --json --root .
$selfScanJson
$count = (($selfScanJson | ConvertFrom-Json).findings | Measure-Object).Count
if ($count -ne 0) { throw "self-scan produced $count findings" } else { "self-scan findings count: $count" }
```

Expected: `self-scan findings count: 0`.

- [ ] **Step 4: Run manifest smoke**

Run:

```powershell
node dist/cli/main.js manifest --json --root .
```

Expected: valid manifest JSON renders and `root` is `<requested-root>`.

- [ ] **Step 5: Run public privacy scan**

Run:

```powershell
$patterns = 'bug bounties|wallet-core|wallet-core-dev-audit|PayPal|paypal|D:/random/bug|D:\\random\\bug|npm_[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|Bearer [A-Za-z0-9._-]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY'
$matches = git grep -n -E $patterns -- README.md CHANGELOG.md AGENTS.md SECURITY.md action.yml .github docs scripts src tests package.json
if ($LASTEXITCODE -eq 1) { 'no matches'; exit 0 }
$filtered = $matches | Where-Object { $_ -notmatch 'git grep -n -E|rg -n|sensitive pattern|private-term pattern|bug bounties\|' }
if ($filtered) { $filtered; exit 1 } else { 'only scan-pattern self-matches'; exit 0 }
```

Expected: `only scan-pattern self-matches` or `no matches`.

- [ ] **Step 6: Append Obsidian log**

Run only after all verification passes:

```powershell
obsidian append path="AgentContextHygiene/Log.md" content="`n## 2026-05-17 local — Child config inheritance implemented`n`nFiles touched: src/config/mergeConfig.ts, src/config/workspaceConfig.ts, src/config/loadConfig.ts, src/core/workspaceScan.ts, src/cli/main.ts, tests/workspaceConfig.test.ts, tests/cli.test.ts, README.md, docs/roadmap.md, docs/superpowers/README.md.`n`n- Workspace scans now load child .drctx.json files when no explicit --config is passed.`n- Direct scans retain nearest-root config behavior.`n- Verification: targeted tests, full tests, typecheck, lint, build, pack dry-run, self-scan findings count 0, manifest smoke, privacy scan.`n`nNext steps: publish as the next patch release after review.`n"
```

If Obsidian CLI fails, do not block source implementation. Record the failure in the final response.

- [ ] **Step 7: Final git status**

Run:

```powershell
git status --short --branch
git log --oneline -10
```

Expected: clean working tree, branch ahead by the task commits if not yet pushed.

---

## Self-review checklist

- Spec coverage: child config inheritance is planned before cross-agent drift, direct scans keep existing behavior, explicit `--config` remains authoritative, invalid child config fails loudly, baseline ownership remains candidate-scoped.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `LoadedConfig`, `mergeWorkspaceChildConfig`, `loadWorkspaceCandidateConfig`, and `explicitConfig` names are used consistently across tasks.
- Privacy: dogfood outputs are aggregate-only; no private repo paths or detailed findings are included in docs or tests.

---

## Execution handoff


Plan complete and saved to `docs/superpowers/plans/2026-05-17-child-config-inheritance.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Recommended: Subagent-Driven.
