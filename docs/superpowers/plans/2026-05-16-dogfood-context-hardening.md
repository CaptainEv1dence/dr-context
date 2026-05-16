# Dogfood Context Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn local dogfood findings into resource-safe scanning and deterministic context-quality checks before adding write-mode or integration features.

**Architecture:** Keep scanner behavior deterministic, local, read-only, and source-backed. Add bounded workspace reads first so large monorepos fail gracefully instead of crashing, then add conservative checks for the context gaps found in real repos: unindexed plan history, thin quickstarts, parent policy visibility, security/live-operation boundaries, and generated-output boundaries.

**Tech Stack:** TypeScript, Node.js, Vitest, fast-glob, existing Dr. Context extractor/check/reporter pipeline.

---

## Dogfood evidence summary

This plan is based on sanitized aggregate dogfood findings only. Do not commit raw local scan JSON, private repository paths, private repository names, or detailed security findings.

- A large smart-contract monorepo scan crashed with Node heap OOM before producing findings.
- A plan/report-heavy trading research repo scanned clean but had too much historical context without an obvious current-plan index.
- A finance assistant repo had useful architecture docs but agent-visible first reads did not name the exact architecture path.
- A payment SDK repo produced stale-reference and generated-output-boundary findings and showed that component-heavy repos need package/path-aware guidance.
- Bug bounty/security-sensitive workspaces need clear local-only/live-operation approval boundaries visible at the scanned repo, not only in a parent workspace.

---

## File structure

### New files

- `src/io/resourceLimits.ts`  
  Owns default scan resource limits and small helpers for classifying files that are skipped or truncated. Keeps resource policy out of `readWorkspace.ts`.
- `src/checks/contextHistory.ts`  
  Owns deterministic context-overload checks such as unindexed dated plan/report history.
- `src/checks/readmeCompleteness.ts`  
  Owns README onboarding checks, starting with missing README verification command when CI/project metadata expose one.
- `src/checks/parentPolicyVisibility.ts`  
  Owns workspace-parent instruction visibility diagnostics.
- `src/checks/liveOperationPolicy.ts`  
  Owns conservative local-only/live-side-effect policy visibility checks for security, payment, contracts, and live-operation repos.
- `tests/resourceLimits.test.ts`  
  Covers bounded workspace reads, skipped/truncated file metadata, and graceful scan output.
- `tests/contextHistory.test.ts`  
  Covers plan/report history checks.
- `tests/readmeCompleteness.test.ts`  
  Covers README quickstart verification checks.
- `tests/parentPolicyVisibility.test.ts`  
  Covers parent instruction visibility checks.
- `tests/liveOperationPolicy.test.ts`  
  Covers security/live-operation policy visibility checks.

### Modified files

- `src/core/types.ts`  
  Add scan resource metadata and new finding IDs to the shared type model.
- `src/io/readWorkspace.ts`  
  Replace unbounded concurrent reads with bounded, deterministic reads. Preserve the current `readWorkspace()` `RawFile[]` return shape by default, and expose skipped-file metadata only when callers opt into `returnResource: true`.
- `src/core/runScan.ts`  
  Thread scan resource metadata into `RepoFacts` and reports.
- `src/core/buildManifest.ts`  
  Thread resource limits through manifest generation so manifest cannot crash on large repos.
- `src/core/checks.ts`  
  Register new checks.
- `src/core/findingReference.ts`  
  Add reference entries for new finding IDs.
- `src/reporting/textReporter.ts`  
  Print concise resource-limit diagnostics and improved one-line finding triage.
- `src/reporting/jsonReporter.ts`  
  Preserve automation-safe JSON while exposing structured scan resource metadata.
- `src/reporting/manifestReporter.ts`  
  Show skipped/truncated context files in manifest output.
- `src/reporting/workspaceReporter.ts`  
  Summarize per-candidate resource-limit diagnostics without leaking absolute paths.
- `src/checks/policyVisibility.ts`  
  Expand generated-output detection with real-world build artifact directories.
- `src/checks/hiddenArchitectureDoc.ts`  
  Distinguish generic architecture mentions from exact path mentions.
- `README.md`  
  Document large-monorepo scan behavior and `.drctx.json` exclude examples.
- `docs/triage-findings.md`  
  Add triage guidance for resource limits, context history, README quickstart gaps, parent policy visibility, and live-operation policy findings.
- `docs/finding-reference.md`  
  Update generated finding docs after reference changes.
- `docs/dogfood-corpus.md`  
  Add sanitized synthetic corpus entries for these dogfood-derived cases.

---

## Finding IDs to add

- `unindexed-context-history`  
  Info finding when a repo has many dated plan/spec/report docs without an obvious current/superseded index.
- `missing-readme-verification`  
  Info or warning when CI/package metadata expose a local verification command but README omits any local verification command.
- `parent-policy-not-inherited`  
  Info finding in workspace scans when parent instructions exist but the child report did not inherit them.
- `missing-live-operation-boundary`  
  Info finding when security/payment/contracts/live-operation signals exist but agent-visible instructions omit local-only and explicit-approval boundaries.

---

## Execution slices

Do **not** execute this whole plan in one PR. The original dogfood evidence produced one P0 reliability bug and several product-quality heuristics. Shipping all of them together would mix scanner infrastructure, report schema changes, discovery behavior, docs, and new finding semantics in one blast radius.

Keep new checks standalone at first. Do not introduce shared check helper abstractions until at least two shipped checks clearly need the same non-trivial logic. A little repeated regex/file-selection code is acceptable here because it keeps each finding easy to audit and tune independently.

Execute as four separate slices:

### Slice 1: Resource-safe scanning, P0

**Goal:** Dr. Context must not OOM on large monorepos.

**Tasks included:**

- Task 1: Add resource-safe workspace reading.
- Task 2: Report resource limits as scan diagnostics.
- Task 2A: Bound workspace scan concurrency.
- Task 10: Improve text report triage for findings.
- Task 12 only for resource-limit verification and synthetic large-repo replay.

**Ship gate:** Large synthetic fixture exits normally with a scan-resource diagnostic; workspace scans run with bounded candidate concurrency; self-scan still passes or any new self-finding is explicitly reviewed.

**Schema invariant:** Keep `schemaVersion: "drctx.report.v1"`. `scanResource` is an optional additive field for JSON consumers. Do not bump to v2 for this slice.

**Configuration invariant:** Make resource limits configurable through `.drctx.json` only in Slice 1. Do not add CLI flags yet. CI needs repeatable config more than one-off command-line knobs.

### Slice 2: Monorepo/package UX, P1

**Goal:** Make package-root scans obvious and useful after resource limits fire.

**Tasks included:**

- Task 3: Add monorepo/package-aware discovery hints.
- README monorepo workflow docs from Task 11.
- Task 12 targeted verification for discovery/workspace reporters.

**Ship gate:** `discover` surfaces synthetic package roots and workspace text gives a concrete package-scan next step without absolute-path leaks.

### Slice 3: Context quality heuristics, P1

**Goal:** Catch context that is present but hard for agents to use.

**Tasks included:**

- Task 4: Detect unindexed dated context history.
- Task 5: Add README verification completeness check.
- Task 6: Improve exact architecture-doc guidance.
- Docs/corpus entries from Task 11 for these finding IDs.

**Ship gate:** New findings are `info` or narrowly scoped `warning`, synthetic fixtures prove no obvious false positives, and clean self-scan remains clean unless reviewed.

**False-positive gate:** Every new heuristic check in this slice must have at least one positive fixture and two negative fixtures. Negative fixtures must cover “related words present but context is already acceptable” and “related words present but signal is too weak.”

### Slice 4: Safety policy visibility and generated-output boundaries, P1/P2

**Goal:** Improve agent-visible safety boundaries for security/live-operation repos and generated artifacts.

**Tasks included:**

- Task 7: Add parent policy visibility diagnostic for workspace scans.
- Task 8: Add live-operation boundary check.
- Task 9: Expand generated-output boundary detection.
- Remaining docs/corpus entries from Task 11.
- Task 12 full verification and optional sanitized private dogfood replay.

**Ship gate:** New safety findings are low-noise info findings, generated-output tests pass, and private dogfood replay reports only sanitized aggregate results in chat.

**False-positive gate:** Every new heuristic check in this slice must have at least one positive fixture and two negative fixtures. For safety/live-operation checks, one negative fixture must include sensitive words such as `sandbox`, `payment`, `RPC`, or `contracts` while also having explicit local-only and approval policy guidance.

---

## Task 1: Add resource-safe workspace reading

**Files:**
- Create: `src/io/resourceLimits.ts`
- Modify: `src/io/readWorkspace.ts`
- Modify: `src/core/types.ts`
- Modify: `src/config/types.ts`
- Modify: `src/config/loadConfig.ts`
- Test: `tests/resourceLimits.test.ts`
- Test: `tests/config.test.ts`

- [ ] **Step 1: Write failing tests for skipped large files and bounded reads**

Create `tests/resourceLimits.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { readWorkspace } from '../src/io/readWorkspace.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-resource-'));
  roots.push(root);
  return root;
}

describe('resource-limited workspace reads', () => {
  test('preserves RawFile[] return shape by default', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');

    const files = await readWorkspace(root);

    expect(Array.isArray(files)).toBe(true);
    expect(files.map((file) => file.path)).toEqual(['AGENTS.md']);
  });

  test('skips context files larger than maxFileBytes without throwing', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
    await writeFile(join(root, 'README.md'), `${'x'.repeat(128)}\n`, 'utf8');

  const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 32, maxTotalBytes: 1024, maxFiles: 20 }
    });

    expect(result.files.map((file) => file.path)).toEqual(['AGENTS.md']);
    expect(result.resource.skippedFiles).toEqual([
      expect.objectContaining({ path: 'README.md', reason: 'file-too-large' })
    ]);
    expect(result.resource.hitLimit).toBe(true);
  });

  test('stops reading before maxTotalBytes is exceeded', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), `${'a'.repeat(24)}\n`, 'utf8');
    await writeFile(join(root, 'README.md'), `${'r'.repeat(24)}\n`, 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 30, maxFiles: 20 }
    });

    expect(result.files.map((file) => file.path)).toEqual(['AGENTS.md']);
    expect(result.resource.skippedFiles).toEqual([
      expect.objectContaining({ path: 'README.md', reason: 'total-bytes-limit' })
    ]);
  });

  test('stops reading after maxFiles and reports deterministic skipped paths', async () => {
    const root = await tempRoot();
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# Readme\n', 'utf8');
    await writeFile(join(root, 'package.json'), '{"scripts":{"test":"vitest run"}}\n', 'utf8');

  const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 4096, maxFiles: 2 }
    });

    expect(result.files).toHaveLength(2);
    expect(result.resource.skippedFiles.map((file) => file.reason)).toContain('file-count-limit');
    expect(result.resource.hitLimit).toBe(true);
  });

  test('ignores files deleted after size check but before read', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');

    const result = await readWorkspace(root, {
      include: [],
      exclude: [],
      returnResource: true,
      limits: { maxFileBytes: 1024, maxTotalBytes: 4096, maxFiles: 20 },
      onAfterStatForTest: async (path) => {
        if (path === 'AGENTS.md') {
          await rm(join(root, 'AGENTS.md'));
        }
      }
    });

    expect(result.files).toEqual([]);
    expect(result.resource.skippedFiles).toEqual([]);
    expect(result.resource.hitLimit).toBe(false);
  });
});
```

For the race test only, add this test hook to `WorkspaceDiscoveryConfig`:

```ts
onAfterStatForTest?: (path: string) => Promise<void>;
```

Call it after `fileSize(root, path)` and before `readOptionalFile(root, path)`. This keeps production behavior unchanged and verifies the existing ENOENT-tolerant read path.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/resourceLimits.test.ts
```

Expected: FAIL because `readWorkspace` has no `returnResource` overload, no `limits`, and no `resource` metadata.

- [ ] **Step 3: Add resource limit types**

Modify `src/core/types.ts`:

```ts
export type ScanSkippedFileReason = 'file-too-large' | 'total-bytes-limit' | 'file-count-limit' | 'read-error';

export type ScanSkippedFile = {
  path: string;
  reason: ScanSkippedFileReason;
  sizeBytes?: number;
  limitBytes?: number;
};

export type ScanResourceSummary = {
  filesRead: number;
  bytesRead: number;
  skippedFiles: ScanSkippedFile[];
  hitLimit: boolean;
};

export type RawFile = {
  path: string;
  content: string;
  sizeBytes?: number;
};
```

Update `RepoFacts` with:

```ts
scanResource: ScanResourceSummary;
```

Update `Report` with:

```ts
scanResource?: ScanResourceSummary;
```

Update `EffectiveConfig` with:

```ts
resourceLimits?: Partial<WorkspaceResourceLimits>;
```

- [ ] **Step 4: Add resource limit config helper and `.drctx.json` support**

Create `src/io/resourceLimits.ts`:

```ts
export type WorkspaceResourceLimits = {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
};

export const defaultWorkspaceResourceLimits: WorkspaceResourceLimits = {
  maxFiles: 500,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 8 * 1024 * 1024
};
```

Modify `src/config/types.ts`:

```ts
import type { WorkspaceResourceLimits } from '../io/resourceLimits.js';

export type DrctxConfig = {
  include?: string[];
  exclude?: string[];
  strict?: boolean;
  baselinePath?: string;
  suppressions: FindingSuppression[];
  resourceLimits?: Partial<WorkspaceResourceLimits>;
};
```

Modify `src/config/loadConfig.ts`:

- Add allowed keys: `maxFiles`, `maxFileBytes`, `maxTotalBytes`.
- Validate each as a positive integer.
- Return them as `resourceLimits` only when at least one key is present.

Add config tests in `tests/config.test.ts`:

```ts
test('loads resource limits from config', async () => {
  const root = await tempRoot();
  await writeFile(join(root, '.drctx.json'), JSON.stringify({ maxFiles: 10, maxFileBytes: 1000, maxTotalBytes: 2000 }), 'utf8');

  const config = await loadConfig(root, {});

  expect(config.resourceLimits).toEqual({ maxFiles: 10, maxFileBytes: 1000, maxTotalBytes: 2000 });
});

test('rejects non-positive resource limits', async () => {
  const root = await tempRoot();
  await writeFile(join(root, '.drctx.json'), JSON.stringify({ maxFiles: 0 }), 'utf8');

  await expect(loadConfig(root, {})).rejects.toThrow('maxFiles must be a positive integer');
});
```

- [ ] **Step 5: Add opt-in resource summary to `readWorkspace`**

Modify `src/io/readWorkspace.ts` so `WorkspaceDiscoveryConfig` becomes:

```ts
import { stat } from 'node:fs/promises';
import { defaultWorkspaceResourceLimits, type WorkspaceResourceLimits } from './resourceLimits.js';
import type { RawFile, ScanResourceSummary, ScanSkippedFile } from '../core/types.js';

export type WorkspaceDiscoveryConfig = {
  include: string[];
  exclude: string[];
  limits?: Partial<WorkspaceResourceLimits>;
  returnResource?: boolean;
};

export type WorkspaceReadResult = {
  files: RawFile[];
  resource: ScanResourceSummary;
};

export function readWorkspace(root: string, config?: WorkspaceDiscoveryConfig & { returnResource?: false }): Promise<RawFile[]>;
export function readWorkspace(root: string, config: WorkspaceDiscoveryConfig & { returnResource: true }): Promise<WorkspaceReadResult>;
```

Replace the unbounded `Promise.all(sortedPaths.map(...))` read with deterministic sequential reads. Keep the existing default return shape for callers that do not opt in:

```ts
  const limits = { ...defaultWorkspaceResourceLimits, ...(config.limits ?? {}) };
  const files: RawFile[] = [];
  const skippedFiles: ScanSkippedFile[] = [];
  let bytesRead = 0;

  for (const path of sortedPaths) {
    if (files.length >= limits.maxFiles) {
      skippedFiles.push({ path, reason: 'file-count-limit' });
      continue;
    }

    const sizeBytes = await fileSize(root, path);
    if (sizeBytes !== undefined && sizeBytes > limits.maxFileBytes) {
      skippedFiles.push({ path, reason: 'file-too-large', sizeBytes, limitBytes: limits.maxFileBytes });
      continue;
    }

    if (sizeBytes !== undefined && bytesRead + sizeBytes > limits.maxTotalBytes) {
      skippedFiles.push({ path, reason: 'total-bytes-limit', sizeBytes, limitBytes: limits.maxTotalBytes });
      continue;
    }

    const file = await readOptionalFile(root, path);
    if (file !== undefined) {
      const fileBytes = file.sizeBytes ?? Buffer.byteLength(file.content, 'utf8');
      bytesRead += fileBytes;
      files.push(file);
    }
  }

  const result = {
    files,
    resource: {
      filesRead: files.length,
      bytesRead,
      skippedFiles,
      hitLimit: skippedFiles.length > 0
    }
  };

  return config.returnResource ? result : result.files;
```

Add helper:

```ts
async function fileSize(root: string, path: string): Promise<number | undefined> {
  try {
    return (await stat(join(root, path))).size;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
```

Update `readOptionalFile` to include `sizeBytes`.

- [ ] **Step 6: Run resource tests**

Run:

```bash
corepack pnpm exec vitest run tests/resourceLimits.test.ts
```

Expected: PASS.

- [ ] **Step 7: Update only callers that need resource metadata**

Keep existing callers and tests that expect `RawFile[]` unchanged unless they need resource metadata. `tests/readWorkspace.test.ts` should continue to pass with:

```ts
const files = await readWorkspace(fixtureRoot);
expect(files.map((file) => file.path)).toEqual([...]);
```

Update `src/core/runScan.ts`:

```ts
const workspace = await readWorkspace(root, { include: config.include, exclude: config.exclude });
const files = workspace.files;
```

Add to facts:

```ts
scanResource: workspace.resource,
```

Add to report:

```ts
scanResource: workspace.resource.hitLimit ? workspace.resource : undefined,
```

- [ ] **Step 8: Run affected tests**

Run:

```bash
corepack pnpm exec vitest run tests/readWorkspace.test.ts tests/resourceLimits.test.ts tests/config.test.ts tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/io/resourceLimits.ts src/io/readWorkspace.ts src/core/types.ts src/core/runScan.ts src/config/types.ts src/config/loadConfig.ts tests/readWorkspace.test.ts tests/resourceLimits.test.ts tests/config.test.ts tests/reporters.test.ts
git commit -m "fix: bound context file reads"
```

---

## Task 2: Report resource limits as scan diagnostics

**Files:**
- Modify: `src/reporting/textReporter.ts`
- Modify: `src/reporting/manifestReporter.ts`
- Modify: `src/reporting/sarifReporter.ts`
- Test: `tests/resourceLimits.test.ts`
- Test: `tests/reporters.test.ts`

- [ ] **Step 1: Add failing test for scan resource diagnostics**

Append to `tests/resourceLimits.test.ts`:

```ts
import { renderSarif } from '../src/reporting/sarifReporter.js';
import { runScan } from '../src/core/runScan.js';

test('reports scan-resource diagnostics when context files are skipped', async () => {
  const root = await tempRoot();
  await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
  await writeFile(join(root, 'README.md'), `${'x'.repeat(128)}\n`, 'utf8');

  const report = await runScan(root, {
    strict: false,
    include: [],
    exclude: [],
    resourceLimits: { maxFileBytes: 32, maxTotalBytes: 1024, maxFiles: 20 }
  });

  expect(report.findings.map((finding) => finding.id)).not.toContain('scan-resource-limit');
  expect(report.scanResource?.skippedFiles).toHaveLength(1);
  expect(report.scanResource?.hitLimit).toBe(true);
  expect(report.summary.health.score).toBe(100);
  expect(renderSarif(report)).not.toContain('scan-resource-limit');
});
```

This requires extending `EffectiveConfig` with optional `resourceLimits`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/resourceLimits.test.ts
```

Expected: FAIL because `resourceLimits` is not accepted and report-level scan diagnostics do not exist.

- [ ] **Step 3: Add config plumbing**

Modify `src/core/types.ts`:

```ts
import type { WorkspaceResourceLimits } from '../io/resourceLimits.js';
```

Add to `EffectiveConfig`:

```ts
resourceLimits?: Partial<WorkspaceResourceLimits>;
```

Update `runScan`:

```ts
const workspace = await readWorkspace(root, {
  include: config.include,
  exclude: config.exclude,
  returnResource: true,
  limits: config.resourceLimits
});
```

- [ ] **Step 4: Keep scan diagnostics out of findings, health, SARIF, and exit code**

Implementation rules:

- Do not create `src/checks/resourceLimits.ts`.
- Do not register a `scan-resource-limit` check.
- Do not add `scan-resource-limit` to `src/core/findingReference.ts`.
- Do expose `report.scanResource` in JSON when limits are hit.
- Do print human-readable text guidance when limits are hit.
- Do not emit SARIF rules/results for scan-resource diagnostics.
- Do not reduce `summary.health.score` for scan-resource diagnostics.
- Do not change exit code solely because resource limits were hit.

Add reporter/exit-code assertions:

```ts
expect(report.summary.health.score).toBe(100);
expect(renderSarif(report)).not.toContain('file-too-large');
expect(renderSarif(report)).not.toContain('total-bytes-limit');
```

Add CLI-level test in `tests/exitCodes.test.ts` or `tests/cli.test.ts`:

```ts
test('resource diagnostics alone do not make check exit non-zero', async () => {
  const result = await runCli(['check', '--root', resourceLimitFixtureRoot]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Scan resource limits: skipped');
});
```

- [ ] **Step 5: Improve text reporter resource UX**

Modify `src/reporting/textReporter.ts` so reports with `scanResource?.hitLimit` include:

```text
Scan resource limits: skipped N context file(s). Results may be incomplete.
Next: narrow the scan with --exclude or scan a package root.
```

Add test in `tests/reporters.test.ts`:

```ts
test('prints resource-limit guidance when files were skipped', () => {
  const output = renderText({
    ...emptyReport,
    scanResource: {
      filesRead: 1,
      bytesRead: 20,
      skippedFiles: [{ path: 'README.md', reason: 'file-too-large', sizeBytes: 2000, limitBytes: 1000 }],
      hitLimit: true
    }
  });

  expect(output).toContain('Scan resource limits: skipped 1 context file(s). Results may be incomplete.');
  expect(output).toContain('Next: narrow the scan with --exclude or scan a package root.');
});
```

- [ ] **Step 6: Run affected tests**

Run:

```bash
corepack pnpm exec vitest run tests/resourceLimits.test.ts tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/core/types.ts src/core/runScan.ts src/reporting/textReporter.ts src/reporting/manifestReporter.ts src/reporting/sarifReporter.ts tests/resourceLimits.test.ts tests/reporters.test.ts
git commit -m "feat: report bounded scan results"
```

---

## Task 2A: Bound workspace scan concurrency

**Files:**
- Create: `src/core/asyncPool.ts`
- Modify: `src/core/workspaceScan.ts`
- Test: `tests/workspaceConcurrency.test.ts`

- [ ] **Step 1: Write failing test for bounded async mapping**

Create `tests/workspaceConcurrency.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { mapWithConcurrency } from '../src/core/asyncPool.js';

describe('mapWithConcurrency', () => {
  test('limits in-flight async work while preserving result order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item * 10;
    });

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  test('rejects invalid concurrency', async () => {
    await expect(mapWithConcurrency([1], 0, async (item) => item)).rejects.toThrow('concurrency must be >= 1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/workspaceConcurrency.test.ts
```

Expected: FAIL because `src/core/asyncPool.ts` does not exist.

- [ ] **Step 3: Add tiny dependency-free async pool**

Create `src/core/asyncPool.ts`:

```ts
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be >= 1');
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
```

- [ ] **Step 4: Replace workspace `Promise.all` with bounded concurrency**

Modify `src/core/workspaceScan.ts`:

```ts
import { mapWithConcurrency } from './asyncPool.js';

const defaultWorkspaceScanConcurrency = 2;
```

Replace:

```ts
const reports = await Promise.all(
  discovery.candidates.map(async (candidate) => {
```

with:

```ts
const reports = await mapWithConcurrency(discovery.candidates, defaultWorkspaceScanConcurrency, async (candidate) => {
```

and close the call with `);` instead of `));`.

Keep report ordering identical to `discovery.candidates`.

- [ ] **Step 5: Run concurrency and workspace tests**

Run:

```bash
corepack pnpm exec vitest run tests/workspaceConcurrency.test.ts tests/workspaceInheritance.test.ts tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2A**

```bash
git add src/core/asyncPool.ts src/core/workspaceScan.ts tests/workspaceConcurrency.test.ts tests/workspaceInheritance.test.ts tests/reporters.test.ts
git commit -m "fix: bound workspace scan concurrency"
```

---

## Task 3: Add monorepo/package-aware discovery hints

**Files:**
- Modify: `src/discovery/discoverCandidates.ts`
- Modify: `src/reporting/discoverTextReporter.ts`
- Modify: `src/reporting/workspaceReporter.ts`
- Modify: `src/core/findingReference.ts`
- Test: `tests/discoverRepositories.test.ts`
- Test: `tests/reporters.test.ts`
- Docs: `README.md`

- [ ] **Step 1: Write failing discovery test for pnpm workspace packages**

Append to `tests/discoverRepositories.test.ts`:

```ts
test('discovers pnpm workspace package roots as candidate repositories', async () => {
  const root = await makeTempRepo({
    'package.json': JSON.stringify({ packageManager: 'pnpm@10.0.0', workspaces: ['packages/*'] }),
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
    'packages/app/package.json': JSON.stringify({ name: 'app', scripts: { test: 'vitest run' } }),
    'packages/app/README.md': '# App\n',
    'packages/lib/package.json': JSON.stringify({ name: 'lib', scripts: { test: 'vitest run' } }),
    'packages/lib/README.md': '# Lib\n'
  });

  const candidates = await discoverCandidates(root, { maxDepth: 4 });

  expect(candidates.map((candidate) => candidate.path)).toEqual(
    expect.arrayContaining(['.', 'packages/app', 'packages/lib'])
  );
});
```

Use the existing helper style in `tests/discoverRepositories.test.ts`. If no temp helper exists, add one in that file only.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/discoverRepositories.test.ts
```

Expected: FAIL until workspace package roots are discovered.

- [ ] **Step 3: Implement package-root candidate detection**

Modify `src/discovery/discoverCandidates.ts`:

- Keep current candidate detection.
- Add package-root signal for directories containing `package.json` under a workspace root.
- Do not read all package contents.
- Use file existence only.
- Preserve deterministic sort.

Implementation rule:

```ts
// A child directory is a package candidate when it contains package.json and is under a root whose package.json has workspaces or pnpm-workspace.yaml exists.
```

- [ ] **Step 4: Add text guidance for monorepo candidates**

Modify `src/reporting/workspaceReporter.ts` to add one line when `reports.length > 1`:

```text
Detected multiple candidate roots. For monorepos, inspect package context with `drctx manifest --root <repo-or-package>`.
```

Do not print absolute paths.

- [ ] **Step 5: Document monorepo workflow**

Add to `README.md` under workspace scan section:

```md
For large monorepos, scan package roots separately when the root scan reports skipped files or too much aggregate context:

```bash
drctx discover --root . --max-depth 4
drctx manifest --root packages/app
drctx check --root packages/app
```

Use `.drctx.json` excludes for generated or vendored areas:

```json
{
  "exclude": ["packages/*/dist/**", "packages/*/coverage/**", "packages/*/generated/**"]
}
```
```

- [ ] **Step 6: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/discoverRepositories.test.ts tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/discovery/discoverCandidates.ts src/reporting/discoverTextReporter.ts src/reporting/workspaceReporter.ts tests/discoverRepositories.test.ts tests/reporters.test.ts README.md
git commit -m "feat: guide monorepo package scans"
```

---

## Task 4: Detect unindexed dated context history

**Files:**
- Create: `src/checks/contextHistory.ts`
- Modify: `src/core/checks.ts`
- Modify: `src/core/findingReference.ts`
- Modify: `src/io/readWorkspace.ts`
- Test: `tests/contextHistory.test.ts`
- Docs: `docs/triage-findings.md`

- [ ] **Step 1: Write failing tests for unindexed plan/report history**

Create `tests/contextHistory.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-history-'));
  roots.push(root);
  return root;
}

describe('context history checks', () => {
  test('reports many dated superpowers plans without an index', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRead latest relevant plan.\n', 'utf8');
    for (let index = 1; index <= 8; index += 1) {
      await writeFile(join(root, 'docs', 'superpowers', 'plans', `2026-05-${String(index).padStart(2, '0')}-slice.md`), '# Plan\n', 'utf8');
    }

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'unindexed-context-history',
          severity: 'info',
          confidence: 'medium'
        })
      ])
    );
  });

  test('does not report dated plans when a superpowers index exists', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRead docs/superpowers/README.md.\n', 'utf8');
    await writeFile(join(root, 'docs', 'superpowers', 'README.md'), '# Current context\n- active: current-plan.md\n', 'utf8');
    for (let index = 1; index <= 8; index += 1) {
      await writeFile(join(root, 'docs', 'superpowers', 'plans', `2026-05-${String(index).padStart(2, '0')}-slice.md`), '# Plan\n', 'utf8');
    }

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'unindexed-context-history')).toHaveLength(0);
  });

  test('does not report a small number of dated plans', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'docs', 'superpowers', 'plans'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRead latest relevant plan.\n', 'utf8');
    for (let index = 1; index <= 3; index += 1) {
      await writeFile(join(root, 'docs', 'superpowers', 'plans', `2026-05-${String(index).padStart(2, '0')}-slice.md`), '# Plan\n', 'utf8');
    }

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'unindexed-context-history')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/contextHistory.test.ts
```

Expected: FAIL because files under `docs/superpowers/**` are not currently read and no check exists.

- [ ] **Step 3: Extend context file discovery narrowly**

Modify `src/io/readWorkspace.ts` `defaultIncludeGlobs` with narrow superpowers index/history surfaces:

```ts
'docs/superpowers/README.md',
'docs/superpowers/index.md',
'docs/superpowers/current.md',
'docs/superpowers/plans/*.{md,mdx}',
'docs/superpowers/specs/*.{md,mdx}',
'docs/superpowers/reports/*.{md,mdx}',
```

Do not recursively include arbitrary deep trees beyond one level for this check.

- [ ] **Step 4: Add context history check**

Create `src/checks/contextHistory.ts`:

```ts
import type { Check, Finding, RawFile } from '../core/types.js';

const datedSuperpowersPattern = /^docs\/superpowers\/(?:plans|specs|reports)\/\d{4}-\d{2}-\d{2}-.+\.mdx?$/i;
const indexPattern = /^docs\/superpowers\/(?:README|index|current)\.md$/i;
const statusPattern = /\b(?:active|current|done|shipped|superseded|superseded_by)\b/i;

export const contextHistoryCheck: Check = {
  id: 'unindexed-context-history',
  run({ facts }): Finding[] {
    const datedFiles = facts.files.filter((file) => datedSuperpowersPattern.test(file.path));
    if (datedFiles.length < 8) {
      return [];
    }

    const indexFiles = facts.files.filter((file) => indexPattern.test(file.path));
    const hasIndex = indexFiles.some((file) => statusPattern.test(file.content));
    if (hasIndex) {
      return [];
    }

    return [buildFinding(datedFiles)];
  }
};

function buildFinding(datedFiles: RawFile[]): Finding {
  return {
    id: 'unindexed-context-history',
    title: `Found ${datedFiles.length} dated plan/spec/report files without a current-context index`,
    category: 'context-history',
    severity: 'info',
    confidence: 'medium',
    primarySource: { file: datedFiles[0].path },
    evidence: [
      {
        kind: 'dated-context-history',
        message: `${datedFiles.length} dated docs/superpowers plan/spec/report file(s) are visible to the scan.`
      },
      {
        kind: 'missing-context-index',
        message: 'No docs/superpowers README/index/current file with active/current/superseded status markers was found.'
      }
    ],
    suggestion: 'Add docs/superpowers/README.md or current.md that names the active plan and marks old plans/reports as done or superseded.'
  };
}
```

Register it in `src/core/checks.ts` after coverage signals.

- [ ] **Step 5: Add finding reference and triage docs**

Add reference entry in `src/core/findingReference.ts`.

Add to `docs/triage-findings.md`:

```md
### `unindexed-context-history`

Dr. Context found many dated plan/spec/report files but no obvious current-context index. Add `docs/superpowers/README.md`, `index.md`, or `current.md` that names the active plan and marks old material as done or superseded.
```

- [ ] **Step 6: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/contextHistory.test.ts tests/readWorkspace.test.ts tests/findingReference.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/checks/contextHistory.ts src/core/checks.ts src/core/findingReference.ts src/io/readWorkspace.ts tests/contextHistory.test.ts tests/readWorkspace.test.ts tests/findingReference.test.ts docs/triage-findings.md
git commit -m "feat: flag unindexed context history"
```

---

## Task 5: Add README verification completeness check

**Files:**
- Create: `src/checks/readmeCompleteness.ts`
- Modify: `src/core/checks.ts`
- Modify: `src/core/findingReference.ts`
- Test: `tests/readmeCompleteness.test.ts`
- Docs: `docs/triage-findings.md`

- [ ] **Step 1: Write failing tests**

Create `tests/readmeCompleteness.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-readme-'));
  roots.push(root);
  return root;
}

describe('README completeness checks', () => {
  test('reports README missing local verification when CI has a test command', async () => {
    const root = await tempRoot();
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# App\n\nRun `app`.\n', 'utf8');
    await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'jobs:\n  test:\n    steps:\n      - run: pixi run tests\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'missing-readme-verification', severity: 'info' })
      ])
    );
  });

  test('does not report when README includes a verification command', async () => {
    const root = await tempRoot();
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# App\n\nRun `pixi run tests` before changes.\n', 'utf8');
    await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'jobs:\n  test:\n    steps:\n      - run: pixi run tests\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(0);
  });

  test('does not report when CI has no local verification command', async () => {
    const root = await tempRoot();
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# App\n\nRun `app`.\n', 'utf8');
    await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'jobs:\n  publish:\n    steps:\n      - run: echo publish\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'missing-readme-verification')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/readmeCompleteness.test.ts
```

Expected: FAIL because no check exists.

- [ ] **Step 3: Add README completeness check**

Create `src/checks/readmeCompleteness.ts`:

```ts
import type { Check, Finding } from '../core/types.js';

const verificationWords = /\b(?:test|tests|pytest|vitest|jest|lint|typecheck|check|build)\b/i;

export const readmeCompletenessCheck: Check = {
  id: 'missing-readme-verification',
  run({ facts }): Finding[] {
    const readme = facts.files.find((file) => /^README\.md$/i.test(file.path));
    if (readme === undefined) {
      return [];
    }

    const ciVerification = facts.ciCommands.find((command) => command.classification === 'verification');
    if (ciVerification === undefined) {
      return [];
    }

    if (verificationWords.test(readme.content)) {
      return [];
    }

    return [
      {
        id: 'missing-readme-verification',
        title: 'README omits a local verification command that CI runs',
        category: 'readme-onboarding',
        severity: 'info',
        confidence: 'medium',
        primarySource: { file: 'README.md' },
        evidence: [
          {
            kind: 'readme',
            message: 'README.md does not mention test, lint, build, check, or another recognizable verification command.',
            source: { file: 'README.md' }
          },
          {
            kind: 'ci-command',
            message: `CI runs \`${ciVerification.command}\`.`,
            source: ciVerification.source
          }
        ],
        suggestion: `Add a quickstart verification step to README.md, for example \`${ciVerification.command}\`.`
      }
    ];
  }
};
```

Register in `src/core/checks.ts` after command checks.

- [ ] **Step 4: Add reference and triage docs**

Add `missing-readme-verification` to `src/core/findingReference.ts` and `docs/triage-findings.md`.

- [ ] **Step 5: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/readmeCompleteness.test.ts tests/findingReference.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/checks/readmeCompleteness.ts src/core/checks.ts src/core/findingReference.ts tests/readmeCompleteness.test.ts tests/findingReference.test.ts docs/triage-findings.md
git commit -m "feat: flag missing readme verification"
```

---

## Task 6: Improve exact architecture-doc guidance

**Files:**
- Modify: `src/checks/hiddenArchitectureDoc.ts`
- Modify: `src/core/findingReference.ts`
- Test: `tests/hiddenArchitectureDoc.test.ts`

- [ ] **Step 1: Add failing test for generic architecture mention**

Append to `tests/hiddenArchitectureDoc.test.ts`:

```ts
test('distinguishes generic architecture mentions from exact architecture path mentions', async () => {
  const report = await runScan(join(fixturesRoot, 'hidden-architecture-generic-mention'), {
    strict: false,
    include: [],
    exclude: []
  });

  const finding = report.findings.find((item) => item.id === 'hidden-architecture-doc');
  expect(finding).toMatchObject({
    suggestion: 'Mention docs/ARCHITECTURE.md exactly in agent-visible first-read instructions.'
  });
  expect(finding?.evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'generic-architecture-reference',
        message: 'Agent instructions mention architecture docs generically but do not name docs/ARCHITECTURE.md.'
      })
    ])
  );
});
```

Create fixture files:

```text
tests/fixtures/hidden-architecture-generic-mention/AGENTS.md
tests/fixtures/hidden-architecture-generic-mention/docs/ARCHITECTURE.md
```

Fixture `AGENTS.md`:

```md
# Agent Instructions

Read the nearest architecture docs before changing behavior.
```

Fixture `docs/ARCHITECTURE.md`:

```md
# Architecture
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/hiddenArchitectureDoc.test.ts
```

Expected: FAIL until the check distinguishes generic mention from exact path mention.

- [ ] **Step 3: Update hidden architecture check**

Modify `src/checks/hiddenArchitectureDoc.ts`:

- Exact path mention suppresses the finding.
- Generic architecture mention does not suppress the finding.
- Generic architecture mention changes evidence/suggestion.

Implementation rule:

```ts
const genericArchitectureMention = /\barchitecture docs?\b|\barchitecture\b/i;
```

Only use this to improve evidence, not to suppress.

- [ ] **Step 4: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/hiddenArchitectureDoc.test.ts tests/findingReference.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/checks/hiddenArchitectureDoc.ts src/core/findingReference.ts tests/hiddenArchitectureDoc.test.ts tests/fixtures/hidden-architecture-generic-mention
git commit -m "fix: clarify hidden architecture docs"
```

---

## Task 7: Add parent policy visibility diagnostic for workspace scans

**Files:**
- Create: `src/checks/parentPolicyVisibility.ts`
- Modify: `src/core/checks.ts`
- Modify: `src/core/workspaceScan.ts`
- Modify: `src/core/types.ts`
- Modify: `src/core/findingReference.ts`
- Test: `tests/parentPolicyVisibility.test.ts`
- Test: `tests/workspaceInheritance.test.ts`

- [ ] **Step 1: Write failing workspace parent policy test**

Create `tests/parentPolicyVisibility.test.ts`:

```ts
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { runWorkspaceScan } from '../src/core/workspaceScan.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-parent-policy-'));
  roots.push(root);
  return root;
}

describe('parent policy visibility', () => {
  test('reports when workspace parent instructions exist but child scan does not inherit them', async () => {
    const root = await tempRoot();
    await mkdir(join(root, 'child'), { recursive: true });
    await writeFile(join(root, 'CLAUDE.md'), '# Parent policy\nDo not run live traffic without explicit approval.\n', 'utf8');
    await writeFile(join(root, 'child', 'package.json'), '{"scripts":{"test":"vitest run"}}\n', 'utf8');
    await writeFile(join(root, 'child', 'README.md'), '# Child\n', 'utf8');

    const workspace = await runWorkspaceScan(root, {
      strict: false,
      include: [],
      exclude: [],
      inheritParentInstructions: false
    });

    const child = workspace.reports.find((entry) => entry.path === 'child');
    expect(child?.report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'parent-policy-not-inherited', severity: 'info' })
      ])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/parentPolicyVisibility.test.ts
```

Expected: FAIL because child reports do not know parent instructions unless inheritance is enabled.

- [ ] **Step 3: Add parent policy metadata**

Modify `src/core/types.ts`:

```ts
parentAgentInstructionDocs?: AgentInstructionDocFact[];
```

Add to `EffectiveConfig`:

```ts
parentAgentInstructionDocs?: AgentInstructionDocFact[];
```

In `runWorkspaceScan`, always extract parent agent instruction docs from the requested root, but only put them into `inheritedAgentInstructionDocs` when `inheritParentInstructions` is true. Otherwise pass them as `parentAgentInstructionDocs`.

- [ ] **Step 4: Add check**

Create `src/checks/parentPolicyVisibility.ts`:

```ts
import type { Check, Finding } from '../core/types.js';

export const parentPolicyVisibilityCheck: Check = {
  id: 'parent-policy-not-inherited',
  run({ config }): Finding[] {
    const parentDocs = config.parentAgentInstructionDocs ?? [];
    if (parentDocs.length === 0 || config.inheritParentInstructions) {
      return [];
    }

    return [
      {
        id: 'parent-policy-not-inherited',
        title: 'Workspace parent instructions exist but are not inherited by this scan',
        category: 'workspace-policy-visibility',
        severity: 'info',
        confidence: 'high',
        evidence: parentDocs.map((doc) => ({
          kind: 'workspace-parent-instructions',
          message: `Parent instruction file ${doc.path} is outside this candidate scan.`,
          source: doc.source
        })),
        suggestion: 'Use --inherit-parent-instructions for workspace scans or copy critical policy into the child repository instructions.'
      }
    ];
  }
};
```

Register near coverage/policy checks.

- [ ] **Step 5: Add reference docs and tests**

Add finding reference entry. Run:

```bash
corepack pnpm exec vitest run tests/parentPolicyVisibility.test.ts tests/workspaceInheritance.test.ts tests/findingReference.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/checks/parentPolicyVisibility.ts src/core/checks.ts src/core/workspaceScan.ts src/core/types.ts src/core/findingReference.ts tests/parentPolicyVisibility.test.ts tests/workspaceInheritance.test.ts tests/findingReference.test.ts
git commit -m "feat: surface parent policy visibility"
```

---

## Task 8: Add live-operation boundary check

**Files:**
- Create: `src/checks/liveOperationPolicy.ts`
- Modify: `src/core/checks.ts`
- Modify: `src/core/findingReference.ts`
- Test: `tests/liveOperationPolicy.test.ts`
- Docs: `docs/triage-findings.md`

- [ ] **Step 1: Write failing tests**

Create `tests/liveOperationPolicy.test.ts`:

```ts
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { runScan } from '../src/core/runScan.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'drctx-live-policy-'));
  roots.push(root);
  return root;
}

describe('live operation policy visibility', () => {
  test('reports security-sensitive repo without explicit live-operation boundary', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# Payment SDK\nSupports checkout, sandbox, and BrowserStack integration tests.\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'missing-live-operation-boundary', severity: 'info' })
      ])
    );
  });

  test('does not report when instructions require approval before live traffic', async () => {
    const root = await tempRoot();
    await writeFile(
      join(root, 'AGENTS.md'),
      '# Agent instructions\nLocal tests are allowed. Do not run live traffic, authenticated actions, or state-changing operations without explicit approval. Do not print secrets or tokens.\n',
      'utf8'
    );
    await writeFile(join(root, 'README.md'), '# Payment SDK\nSupports checkout, sandbox, and BrowserStack integration tests.\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'missing-live-operation-boundary')).toHaveLength(0);
  });

  test('does not report generic contracts wording without live-operation signals', async () => {
    const root = await tempRoot();
    await writeFile(join(root, 'AGENTS.md'), '# Agent instructions\nRun tests.\n', 'utf8');
    await writeFile(join(root, 'README.md'), '# Contracts\nThis package contains TypeScript type contracts for internal APIs.\n', 'utf8');

    const report = await runScan(root, { strict: false, include: [], exclude: [] });

    expect(report.findings.filter((finding) => finding.id === 'missing-live-operation-boundary')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/liveOperationPolicy.test.ts
```

Expected: FAIL because no check exists.

- [ ] **Step 3: Add live operation check**

Create `src/checks/liveOperationPolicy.ts`:

```ts
import type { Check, Finding } from '../core/types.js';

const sensitiveSignals = /\b(?:bug bounty|security research|payment|checkout|sandbox|browserstack|rpc|mainnet|testnet|smart contracts?|contracts|trading|live)\b/i;
const approvalBoundary = /\b(?:do not|don't|never|must not|without approval|requires approval|explicit approval|ask before|confirm before)\b[^.\n]*(?:live|traffic|authenticated|state-changing|payment|checkout|rpc|mainnet|testnet|production|account|secrets?|tokens?)/i;
const localOnlyBoundary = /\b(?:local-only|local only|local tests?|offline|unit tests?)\b/i;

export const liveOperationPolicyCheck: Check = {
  id: 'missing-live-operation-boundary',
  run({ facts }): Finding[] {
    const repoText = facts.files
      .filter((file) => /^(?:README\.md|SECURITY\.md|docs\/SECURITY\.md|package\.json)$/i.test(file.path))
      .map((file) => file.content)
      .join('\n');

    if (!sensitiveSignals.test(repoText)) {
      return [];
    }

    const instructionText = facts.agentInstructionDocs.map((doc) => doc.content).join('\n');
    if (approvalBoundary.test(instructionText) && localOnlyBoundary.test(instructionText)) {
      return [];
    }

    return [
      {
        id: 'missing-live-operation-boundary',
        title: 'Security-sensitive or live-operation repo lacks an agent-visible approval boundary',
        category: 'safety-policy-visibility',
        severity: 'info',
        confidence: 'medium',
        evidence: [
          {
            kind: 'sensitive-operation-signal',
            message: 'Repository docs mention security, payment, contracts, sandbox, BrowserStack, RPC, trading, or live-operation signals.'
          },
          {
            kind: 'agent-instructions',
            message: 'Agent-visible instructions do not clearly require local-only defaults and explicit approval before live or state-changing actions.'
          }
        ],
        suggestion: 'Add agent-visible guidance: local/offline tests are allowed, but live traffic, authenticated actions, state-changing operations, and secret handling require explicit approval.'
      }
    ];
  }
};
```

Register in `src/core/checks.ts` after policy visibility checks.

- [ ] **Step 4: Add reference and triage docs**

Add `missing-live-operation-boundary` to `src/core/findingReference.ts` and `docs/triage-findings.md`.

- [ ] **Step 5: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/liveOperationPolicy.test.ts tests/findingReference.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 8**

```bash
git add src/checks/liveOperationPolicy.ts src/core/checks.ts src/core/findingReference.ts tests/liveOperationPolicy.test.ts tests/findingReference.test.ts docs/triage-findings.md
git commit -m "feat: flag missing live operation boundaries"
```

---

## Task 9: Expand generated-output boundary detection

**Files:**
- Modify: `src/checks/policyVisibility.ts`
- Test: `tests/policyVisibilityChecks.test.ts`
- Docs: `docs/triage-findings.md`

- [ ] **Step 1: Add failing tests for Storybook and generated type outputs**

Append to `tests/policyVisibilityChecks.test.ts`:

```ts
test('reports missing generated boundary for Storybook static build outputs', async () => {
  const report = await runScan(join(fixturesRoot, 'generated-storybook-boundary'), {
    strict: false,
    include: [],
    exclude: []
  });

  expect(report.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'missing-generated-file-boundary' })
    ])
  );
});
```

Create fixture:

```text
tests/fixtures/generated-storybook-boundary/AGENTS.md
tests/fixtures/generated-storybook-boundary/package.json
```

`AGENTS.md`:

```md
# Agent Instructions

Run npm test before changes.
```

`package.json`:

```json
{
  "scripts": {
    "storybook:build": "storybook build -o storybook-static",
    "test": "jest"
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/policyVisibilityChecks.test.ts
```

Expected: FAIL until Storybook generated output is recognized.

- [ ] **Step 3: Expand generated artifact patterns**

Modify `namesGeneratedOutput` in `src/checks/policyVisibility.ts` to include:

```ts
return /(?:^|[./\\\s"'])(?:dist|build|generated|storybook-static|playwright-report|test-results|coverage|typechain-types|src\/generated|generated\/api)(?:$|[./\\\s"'/*-])/i.test(value);
```

Also treat these script names as generation/build evidence:

```ts
/^(?:build|prebuild|generate|generate-version|storybook:build|codegen|typechain)$/
```

- [ ] **Step 4: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/policyVisibilityChecks.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 9**

```bash
git add src/checks/policyVisibility.ts tests/policyVisibilityChecks.test.ts tests/fixtures/generated-storybook-boundary docs/triage-findings.md
git commit -m "feat: expand generated output detection"
```

---

## Task 10: Improve text report triage for findings

**Files:**
- Modify: `src/reporting/textReporter.ts`
- Test: `tests/reporters.test.ts`

- [ ] **Step 1: Add failing text reporter test for one-line why/fix output**

Append to `tests/reporters.test.ts`:

```ts
test('prints concise finding title and suggested fix in text output', () => {
  const output = renderText({
    ...emptyReport,
    findings: [
      {
        id: 'hidden-architecture-doc',
        title: 'Architecture doc is not visible from agent instructions',
        category: 'architecture-doc',
        severity: 'warning',
        confidence: 'high',
        evidence: [{ kind: 'architecture-doc', message: 'docs/ARCHITECTURE.md appears to be an architecture source of truth.' }],
        suggestion: 'Mention docs/ARCHITECTURE.md exactly in agent-visible first-read instructions.'
      }
    ],
    summary: scanSummary({ errors: 0, warnings: 1, infos: 0 })
  });

  expect(output).toContain('Why: Architecture doc is not visible from agent instructions');
  expect(output).toContain('Fix: Mention docs/ARCHITECTURE.md exactly in agent-visible first-read instructions.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
corepack pnpm exec vitest run tests/reporters.test.ts
```

Expected: FAIL until reporter prints the new concise lines.

- [ ] **Step 3: Update text reporter**

Modify each finding block in `src/reporting/textReporter.ts` to include:

```ts
lines.push(`Why: ${finding.title}`);
if (finding.suggestion !== undefined) {
  lines.push(`Fix: ${finding.suggestion}`);
}
```

Keep the existing `Evidence:` and `Suggested fix:` blocks for compatibility unless tests are intentionally updated.

- [ ] **Step 4: Run tests**

Run:

```bash
corepack pnpm exec vitest run tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 10**

```bash
git add src/reporting/textReporter.ts tests/reporters.test.ts
git commit -m "feat: tighten finding triage output"
```

---

## Task 11: Docs validation and public-safe dogfood corpus

**Files:**
- Modify: `docs/finding-reference.md`
- Modify: `docs/dogfood-corpus.md`
- Modify: `docs/triage-findings.md`
- Modify: `README.md`
- Test: `tests/docsReference.test.ts`
- Test: `tests/dogfoodCorpus.test.ts`

- [ ] **Step 1: Run docs validation to see missing docs**

Run:

```bash
corepack pnpm exec vitest run tests/docsReference.test.ts tests/dogfoodCorpus.test.ts
```

Expected: FAIL if new finding IDs are missing from docs/corpus expectations.

- [ ] **Step 2: Update finding reference docs**

Run the existing docs-generation command if present. If no generator exists, update `docs/finding-reference.md` manually from `src/core/findingReference.ts`.

Required new sections:

```md
### `unindexed-context-history`
### `missing-readme-verification`
### `parent-policy-not-inherited`
### `missing-live-operation-boundary`
```

- [ ] **Step 3: Add synthetic dogfood corpus entries**

Update `docs/dogfood-corpus.md` with public-safe synthetic examples only:

```md
### Large monorepo resource diagnostic

Synthetic repo with many generated docs or oversized markdown files. Expected report-level scan-resource diagnostic, no SARIF result, no health penalty, and no exit-code change solely because files were skipped.

### Unindexed plan history

Synthetic repo with many `docs/superpowers/plans/YYYY-MM-DD-*` files and no `docs/superpowers/README.md`. Expected finding: `unindexed-context-history`.

### Thin README with CI tests

Synthetic repo where CI runs `pixi run tests` but README omits verification. Expected finding: `missing-readme-verification`.
```

Do not mention local/private repo names.

- [ ] **Step 4: Update README workflow docs**

Add a short section:

```md
### Large repositories and monorepos

Dr. Context uses bounded local reads. If a scan reports skipped context files in its scan-resource diagnostics, the report is still valid for files read, but incomplete for skipped files. Narrow the scan or add excludes:

```bash
drctx discover --root . --max-depth 4
drctx check --root packages/app
drctx check --root . --exclude "packages/*/coverage/**" "packages/*/dist/**"
```
```

- [ ] **Step 5: Run docs tests**

Run:

```bash
corepack pnpm exec vitest run tests/docsReference.test.ts tests/dogfoodCorpus.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 11**

```bash
git add README.md docs/finding-reference.md docs/dogfood-corpus.md docs/triage-findings.md tests/docsReference.test.ts tests/dogfoodCorpus.test.ts
git commit -m "docs: add dogfood hardening guidance"
```

---

## Task 12: Verification gate and sanitized dogfood replay

**Files:**
- No source files unless verification reveals bugs.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
corepack pnpm exec vitest run tests/resourceLimits.test.ts tests/contextHistory.test.ts tests/readmeCompleteness.test.ts tests/parentPolicyVisibility.test.ts tests/liveOperationPolicy.test.ts tests/policyVisibilityChecks.test.ts tests/hiddenArchitectureDoc.test.ts tests/reporters.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
corepack pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck, lint, build, and pack dry-run**

Run:

```bash
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
```

Expected: all PASS.

- [ ] **Step 4: Run Dr. Context self-scan**

Run:

```bash
node dist/cli/main.js check --json --root .
```

Expected: `summary.health.score` is `100` and `findings` is empty unless a new finding is explicitly reviewed and documented.

- [ ] **Step 5: Replay sanitized large-repo scenario**

Run against a synthetic large fixture, not a private repo:

```bash
node dist/cli/main.js check --root tests/fixtures/large-monorepo-resource-limit
```

Expected: exits normally, prints a scan-resource diagnostic, no OOM.

- [ ] **Step 6: Optional local private dogfood, no persisted output**

If approved by the user, rerun the same five local dogfood roots and report only aggregate sanitized results in chat. Do not write raw output files. Do not commit private paths or findings.

- [ ] **Step 7: Commit any verification docs updates**

Only if docs changed during verification:

```bash
git add README.md docs/triage-findings.md docs/dogfood-corpus.md docs/finding-reference.md
git commit -m "docs: clarify hardening verification"
```

---

## Self-review checklist

- [ ] P0 OOM failure has a concrete resource-limit task with failing tests.
- [ ] Large monorepo/package workflow is planned before write-mode features.
- [ ] Plan/report overload from dogfood has an explicit deterministic info check.
- [ ] Thin README/architecture first-read gaps have explicit checks.
- [ ] Parent policy and live-operation boundaries are planned as info findings first to reduce noise.
- [ ] Public docs use synthetic examples only.
- [ ] No private local repository names, raw scan JSON, or sensitive details are committed.
- [ ] Final verification includes tests, typecheck, lint, build, pack dry-run, and Dr. Context self-scan.
