# drctx init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dry-run-first `drctx init` command that previews or creates missing starter context files without overwriting existing files.

**Architecture:** Keep init as a small CLI adapter over a focused planning/writing service. The service inspects only repo-local files, returns a deterministic plan, and writes only missing files when `--write` is passed. Existing scan/check/manifest behavior remains unchanged.

**Tech Stack:** TypeScript, Commander, Node `fs/promises`, Vitest CLI tests, existing instruction surface registry.

---

## Scope

In scope:

- `drctx init --root .` dry-run preview.
- `drctx init --root . --write` creates missing files.
- Creates `.drctx.json` only when missing.
- Creates `AGENTS.md` only when no recognized instruction surface exists.
- Never overwrites existing files.
- No network, no LLM, no secrets, no local machine paths in generated templates.

Out of scope:

- GitHub Action generation.
- `--force`.
- AI-generated repo-specific instructions.
- Safe fixes or broad rewrites.
- Creating files outside `--root`.

## File structure

### Create

- `src/init/initPlan.ts`  
  Pure planning and text template generation for init.
- `tests/initPlan.test.ts`  
  Unit tests for dry-run planning, existing-file behavior, and template content.

### Modify

- `src/cli/main.ts`  
  Add the `init` command and route to the init service.
- `tests/cli.test.ts`  
  CLI integration coverage for dry-run/write/no-overwrite behavior.
- `README.md`  
  Add minimal first-run init docs.
- `docs/roadmap.md`  
  Mark `drctx init` as current/adoption slice if needed.
- `docs/superpowers/README.md`  
  Update active plan pointer from gap closure to this plan.
- `AgentContextHygiene/Log.md` through Obsidian CLI only  
  Append implementation summary and verification evidence.

---

## Task 1: Init planning service

**Files:**
- Create: `src/init/initPlan.ts`
- Create: `tests/initPlan.test.ts`

- [ ] **Step 1: Write failing tests for init planning**

Create `tests/initPlan.test.ts` with:

```ts
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

  test('templates are generic and do not contain local machine paths or secrets', () => {
    const plan = planInit([]);
    const combined = plan.files.map((entry) => entry.content ?? '').join('\n');

    expect(combined).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
    expect(combined).not.toMatch(/token|secret|password|api[_-]?key/i);
    expect(combined).toContain('corepack pnpm test');
    expect(combined).toContain('corepack pnpm run typecheck');
    expect(combined).toContain('corepack pnpm run lint');
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
corepack pnpm exec vitest run tests/initPlan.test.ts
```

Expected: FAIL because `src/init/initPlan.ts` does not exist.

- [ ] **Step 3: Implement the init planner**

Create `src/init/initPlan.ts` with:

```ts
import type { RawFile } from '../core/types.js';
import { getInstructionSurfaceForPath } from '../extractors/instructionSurfaces.js';

export type InitFileAction = 'create' | 'skip';

export type InitFilePlan = {
  path: string;
  action: InitFileAction;
  reason: string;
  content?: string;
};

export type InitPlan = {
  files: InitFilePlan[];
};

export function planInit(files: RawFile[]): InitPlan {
  const paths = new Set(files.map((file) => file.path.toLowerCase()));
  const hasInstructionSurface = files.some((file) => getInstructionSurfaceForPath(file.path) !== undefined);

  return {
    files: [
      paths.has('.drctx.json')
        ? { path: '.drctx.json', action: 'skip', reason: 'already exists' }
        : { path: '.drctx.json', action: 'create', reason: 'missing Dr. Context config', content: configTemplate() },
      hasInstructionSurface
        ? { path: 'AGENTS.md', action: 'skip', reason: 'recognized instruction surface exists' }
        : { path: 'AGENTS.md', action: 'create', reason: 'no recognized instruction surface found', content: agentsTemplate() }
    ]
  };
}

export function configTemplate(): string {
  return `${JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/CaptainEv1dence/dr-context/main/schema/drctx.schema.json',
    maxFiles: 500,
    maxFileBytes: 262144,
    maxTotalBytes: 1048576,
    exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**']
  }, null, 2)}\n`;
}

export function agentsTemplate(): string {
  return `# AGENTS.md

## Project context

- Keep this file short and specific to facts agents cannot infer from code.
- Link to architecture or domain docs instead of pasting long documents here.

## Verification

Run these before claiming work is complete:

\`\`\`bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
\`\`\`

## Safety

- Do not commit secrets, credentials, tokens, local env files, runtime databases, logs, or caches.
- Prefer targeted tests for the code you changed, then run the wider gate above.
`;
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```powershell
corepack pnpm exec vitest run tests/initPlan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Before commit, run:

```powershell
git diff --check -- src/init/initPlan.ts tests/initPlan.test.ts
git grep -n -E "bug bounties|wallet-core|wallet-core-dev-audit|PayPal|paypal|D:/random/bug|D:\\random\\bug|npm_[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|Bearer [A-Za-z0-9._-]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY" -- src/init/initPlan.ts tests/initPlan.test.ts
```

Expected: no whitespace errors and no sensitive matches. If `git grep` exits `1` due no matches, treat as success.

Commit:

```powershell
git add src/init/initPlan.ts tests/initPlan.test.ts
git commit -m "feat: plan init starter files"
```

---

## Task 2: CLI init command, dry-run and write mode

**Files:**
- Modify: `src/cli/main.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add failing CLI tests**

Append these tests to `tests/cli.test.ts` near other command tests:

```ts
  test('init dry-run previews files without writing', async () => {
    const root = await makeSyntheticRepo({});

    const result = await runCli(['node', 'dr-context', 'init', '--root', root]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Dr. Context init preview');
    expect(result.stdout).toContain('Would create:');
    expect(result.stdout).toContain('- .drctx.json');
    expect(result.stdout).toContain('- AGENTS.md');
    await expect(import('node:fs/promises').then(({ readFile }) => readFile(join(root, 'AGENTS.md'), 'utf8'))).rejects.toThrow();
  });

  test('init --write creates only missing starter files', async () => {
    const root = await makeSyntheticRepo({});

    const result = await runCli(['node', 'dr-context', 'init', '--root', root, '--write']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Created:');
    expect(await import('node:fs/promises').then(({ readFile }) => readFile(join(root, '.drctx.json'), 'utf8'))).toContain('maxFiles');
    expect(await import('node:fs/promises').then(({ readFile }) => readFile(join(root, 'AGENTS.md'), 'utf8'))).toContain('corepack pnpm test');
  });

  test('init --write does not overwrite existing files', async () => {
    const root = await makeSyntheticRepo({
      '.drctx.json': '{"strict":true}\n',
      'CLAUDE.md': '# Existing instructions\n'
    });

    const result = await runCli(['node', 'dr-context', 'init', '--root', root, '--write']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Skipped:');
    expect(await import('node:fs/promises').then(({ readFile }) => readFile(join(root, '.drctx.json'), 'utf8'))).toBe('{"strict":true}\n');
    await expect(import('node:fs/promises').then(({ readFile }) => readFile(join(root, 'AGENTS.md'), 'utf8'))).rejects.toThrow();
  });
```

- [ ] **Step 2: Run CLI tests and verify failure**

Run:

```powershell
corepack pnpm exec vitest run tests/cli.test.ts
```

Expected: FAIL because `init` is unknown.

- [ ] **Step 3: Add CLI routing and write behavior**

Modify `src/cli/main.ts`:

1. Change imports:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { readWorkspace } from '../io/readWorkspace.js';
import { planInit, type InitPlan } from '../init/initPlan.js';
```

Keep the existing `basename` import from `node:path` too. The final path import should include `basename, dirname, extname, resolve`.

2. Add type:

```ts
type InitCliOptions = { root?: string; write?: boolean };
```

3. Add a new action parameter to `createProgram`:

```ts
  initAction: (options: InitCliOptions, parentOptions: CliOptions) => Promise<void>,
```

Place it before `explainAction` to keep explain last.

4. In the `createProgram(...)` call inside `runCli`, add an init action:

```ts
    async (options, parentOptions) => {
      try {
        const effectiveOptions = { ...parentOptions, ...options };
        const root = effectiveOptions.root ? resolve(effectiveOptions.root) : process.cwd();
        const workspace = await readWorkspace(root, { include: [], exclude: [] });
        const initPlan = planInit(workspace);

        if (effectiveOptions.write) {
          for (const entry of initPlan.files) {
            if (entry.action !== 'create' || entry.content === undefined) {
              continue;
            }
            const outputPath = resolve(root, entry.path);
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, entry.content, { flag: 'wx' });
          }
        }

        stdout += renderInitPlan(initPlan, { write: Boolean(effectiveOptions.write) });
        exitCode = 0;
      } catch (error) {
        stderr += formatCliError(error);
        exitCode = 2;
      }
    },
```

5. In `createProgram`, add the command before `explain`:

```ts
  program
    .command('init')
    .description('preview or create starter Dr. Context files')
    .option('--root <path>', 'repository root to initialize')
    .option('--write', 'create missing starter files')
    .action((options: InitCliOptions) => initAction(options, program.opts<CliOptions>()));
```

6. Add renderer near `renderScanReport`:

```ts
function renderInitPlan(plan: InitPlan, options: { write: boolean }): string {
  const creates = plan.files.filter((entry) => entry.action === 'create');
  const skips = plan.files.filter((entry) => entry.action === 'skip');
  const lines = [options.write ? 'Dr. Context init' : 'Dr. Context init preview', ''];

  if (creates.length > 0) {
    lines.push(options.write ? 'Created:' : 'Would create:');
    for (const entry of creates) {
      lines.push(`- ${entry.path}`);
    }
    lines.push('');
  }

  if (skips.length > 0) {
    lines.push('Skipped:');
    for (const entry of skips) {
      lines.push(`- ${entry.path} (${entry.reason})`);
    }
    lines.push('');
  }

  if (!options.write && creates.length > 0) {
    lines.push('Run with --write to create missing files.', '');
  }

  if (options.write && creates.length === 0) {
    lines.push('No files created.', '');
  }

  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 4: Run CLI tests and verify pass**

Run:

```powershell
corepack pnpm exec vitest run tests/cli.test.ts tests/initPlan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Before commit, run:

```powershell
git diff --check -- src/cli/main.ts tests/cli.test.ts
git grep -n -E "bug bounties|wallet-core|wallet-core-dev-audit|PayPal|paypal|D:/random/bug|D:\\random\\bug|npm_[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|Bearer [A-Za-z0-9._-]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY" -- src/cli/main.ts tests/cli.test.ts
```

Expected: no whitespace errors and no sensitive matches. If `git grep` exits `1` due no matches, treat as success.

Commit:

```powershell
git add src/cli/main.ts tests/cli.test.ts
git commit -m "feat: add dry-run init command"
```

---

## Task 3: Docs and current plan pointers

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/superpowers/README.md`
- Obsidian append: `AgentContextHygiene/Log.md`

- [ ] **Step 1: Update README**

Add a short section near first-run usage:

```md
### Start a new repo safely

Preview starter files without writing anything:

```bash
drctx init --root .
```

Create only missing starter files:

```bash
drctx init --root . --write
```

`drctx init` never overwrites existing files. It creates `.drctx.json` when missing and creates `AGENTS.md` only when no recognized instruction surface exists.
```

- [ ] **Step 2: Update roadmap**

In `docs/roadmap.md`, add a shipped/current note under the current development section:

```md
- `drctx init` adoption slice:
  - Dry-run preview by default.
  - `--write` creates only missing `.drctx.json` and `AGENTS.md` starter files.
  - No overwrite, no network, no LLM, no GitHub Action generation.
```

- [ ] **Step 3: Update superpowers index**

In `docs/superpowers/README.md`, set active plan/spec to:

```md
- Active plan: `docs/superpowers/plans/2026-05-16-drctx-init.md`
- Active spec: `docs/superpowers/specs/2026-05-16-drctx-init-design.md`
```

Move pre-0.4 gap closure to Done.

- [ ] **Step 4: Append Obsidian log**

Run:

```powershell
$content = "drctx init implementation started from docs/superpowers/specs/2026-05-16-drctx-init-design.md: dry-run default, --write creates only missing .drctx.json/AGENTS.md, no overwrite/network/LLM."
obsidian append path="AgentContextHygiene/Log.md" content="$content"
```

- [ ] **Step 5: Verify docs and commit**

Run:

```powershell
git diff --check -- README.md docs/roadmap.md docs/superpowers/README.md
git grep -n -E "bug bounties|wallet-core|wallet-core-dev-audit|PayPal|paypal|D:/random/bug|D:\\random\\bug|npm_[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|Bearer [A-Za-z0-9._-]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY" -- README.md docs/roadmap.md docs/superpowers/README.md
```

Expected: no whitespace errors and no sensitive matches. If `git grep` exits `1` due no matches, treat as success.

Commit:

```powershell
git add README.md docs/roadmap.md docs/superpowers/README.md
git commit -m "docs: document init onboarding"
```

---

## Task 4: Full verification and final report

**Files:**
- Obsidian append: `AgentContextHygiene/Log.md`

- [ ] **Step 1: Run targeted and full gates**

Run:

```powershell
corepack pnpm exec vitest run tests/initPlan.test.ts tests/cli.test.ts tests/manifest.test.ts
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
npm publish --dry-run --access public
node dist/cli/main.js init --root .
node dist/cli/main.js check --json --root .
node dist/cli/main.js manifest --json --root .
```

Expected:

```text
targeted tests pass
full tests pass
typecheck/lint/build pass
pack dry-run reports dr-context@0.3.12 unless version is bumped later
npm publish dry-run succeeds, or skip is explicitly recorded if auth/network unavailable
init dry-run prints preview and does not write files
self-scan findings []
manifest renders successfully
```

- [ ] **Step 2: Run privacy scan**

Run:

```powershell
$patterns = "bug bounties|wallet-core|wallet-core-dev-audit|PayPal|paypal|D:/random/bug|D:\\random\\bug|npm_[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|Bearer [A-Za-z0-9._-]+|BEGIN (RSA|OPENSSH|PRIVATE) KEY"
$matches = git grep -n -E $patterns -- README.md CHANGELOG.md AGENTS.md SECURITY.md action.yml .github docs scripts src tests package.json
if ($LASTEXITCODE -eq 1) { "no matches"; exit 0 }
$filtered = $matches | Where-Object { $_ -notmatch 'git grep -n -E|rg -n|sensitive pattern|private-term pattern|bug bounties\|' }
if ($filtered) { $filtered; exit 1 } else { "only scan-pattern self-matches"; exit 0 }
```

Expected: `no matches` or `only scan-pattern self-matches`.

- [ ] **Step 3: Check final state**

Run:

```powershell
git status --short --branch
git log --oneline -10
```

Expected: no uncommitted repo files. Branch is ahead by init commits.

- [ ] **Step 4: Append final Obsidian log**

Run:

```powershell
$content = "drctx init implemented and verified: targeted tests, full tests, typecheck, lint, build, pack dry-run, npm publish dry-run, init dry-run, self-scan, and manifest all passed."
obsidian append path="AgentContextHygiene/Log.md" content="$content"
```

- [ ] **Step 5: Final response**

Report:

```text
DONE or DONE_WITH_CONCERNS
commits created
verification commands and outcomes
whether release 0.3.13 is recommended next
```

Do not claim completion without the verification output from Step 1.

---

## Self-review

- Spec coverage: dry-run default, optional `--write`, no overwrite, creates `.drctx.json` only when missing, creates `AGENTS.md` only when no recognized instruction surface exists, no network/LLM, and tests for write/dry-run behavior are covered.
- Placeholder scan: no placeholders remain in implementation steps.
- Type consistency: init planner exposes `planInit`, `InitPlan`, and file actions used consistently by CLI renderer.
- Scope check: no GitHub Action generation, no `--force`, no AI customization, no safe fixes.
