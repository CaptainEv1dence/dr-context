# Dr. Context

Diagnose and fix context rot before your coding agent reads it.

Dr. Context is a local, read-only CLI that checks `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, package files, CI workflows, and architecture docs for stale commands, missing verification instructions, and hidden source-of-truth docs.

## Install

```bash
npx dr-context
```

Or after install:

```bash
drctx check
```

Scan another repository without changing directories:

```bash
drctx check --root ../other-repo
```

Find candidate repository roots under a folder without scanning them:

```bash
drctx discover --root ../workspace --max-depth 3
```

Scan candidate repository roots under a folder and print a privacy-preserving aggregate report:

```bash
drctx check --workspace --root ../workspace --max-depth 3
```

Emit SARIF for GitHub code scanning or other SARIF consumers:

```bash
drctx check --sarif --root . > dr-context.sarif
```

Run in GitHub Actions:

```yaml
- uses: CaptainEv1dence/dr-context@v0.2.0
  with:
    root: .
    upload-sarif: 'true'
```

## Quick start

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run pack:dry-run
node dist/cli/main.js check --json --root .
```

Dr. Context dogfoods itself. Treat the self-scan as a required quality gate alongside tests, typecheck, lint, build, and package dry-run. It should report zero findings unless a finding is explicitly reviewed and accepted.

Before publishing, inspect the package contents:

```bash
pnpm run pack:dry-run
```

If `pnpm` is not on PATH, use Corepack:

```bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
node dist/cli/main.js check --json --root .
```

## Example

```text
Dr. Context

Found 2 finding(s).

1. WARNING ci-doc-command-mismatch (high)
.github/workflows/ci.yml:8 - CI runs "lint" but agent instructions do not mention it

Evidence:
- .github/workflows/ci.yml:8 runs `pnpm run lint`.
- No agent-visible instruction mentions `pnpm run lint` or `pnpm lint`.
- package.json defines script "lint".

Suggested fix:
- Add `pnpm run lint` to agent verification instructions so local agent checks match CI.

2. WARNING ci-doc-command-mismatch (high)
.github/workflows/ci.yml:9 - CI runs "typecheck" but agent instructions do not mention it

Evidence:
- .github/workflows/ci.yml:9 runs `corepack pnpm run typecheck`.
- No agent-visible instruction mentions `pnpm run typecheck` or `pnpm typecheck`.
- package.json defines script "typecheck".

Suggested fix:
- Add `pnpm run typecheck` to agent verification instructions so local agent checks match CI.
```

## Why

AI coding agents often fail because repo context rots. The agent is told old commands, misses architecture docs, or loads bloated rules. Dr. Context finds the concrete places where your repo is misleading the agent.

## Current scope

- Package manager mismatch.
- Stale command references.
- Missing verification commands.
- CI/doc command mismatch.
- Architecture docs discovery and visibility.
- Coverage signals for repos with no supported context files or no agent-visible instructions.
- Placeholder failing test script detection.
- Multiple JavaScript lockfile detection.
- Candidate root discovery for folders that contain multiple repos or shared agent instructions.
- Workspace scanning with privacy-preserving aggregate JSON and text output.
- Evidence-backed text and JSON reports.
- SARIF 2.1.0 reporting for code scanning integrations.

## Discover candidate roots

Use `discover` when a folder contains multiple repos or shared agent instructions:

```bash
drctx discover --root ../workspace
```

It reports candidate roots and signal names only. It does not scan each child, merge parent and child instructions, or print file contents.

JSON output uses `schemaVersion: "drctx.discover.v1"`:

```json
{
  "schemaVersion": "drctx.discover.v1",
  "root": "<requested-root>",
  "candidates": [
    {
      "path": ".",
      "type": "agent-context-root",
      "signals": ["AGENTS.md"]
    },
    {
      "path": "repo-a",
      "type": "git-repository",
      "signals": [".git", "AGENTS.md", "package.json"]
    }
  ],
  "summary": {
    "candidates": 2
  }
}
```

Candidate types:

- `git-repository`: has `.git`.
- `agent-context-root`: has agent instruction files but no `.git`.
- `package-root`: has package or lockfile signals but no `.git` or agent instruction file.

Unlike scan reports, discover JSON does not echo the absolute requested root. Candidate paths are relative to the requested root.

## Workspace scan

Use `check --workspace` when you want to scan every discovered candidate root under a folder:

```bash
drctx check --workspace --root ../workspace --json
```

Workspace JSON uses `schemaVersion: "drctx.workspace-report.v1"`, redacts the requested root as `<requested-root>`, and redacts each child scan root as `<candidate-root>`. Candidate paths remain relative to the requested root.

## Useful findings

### `no-scannable-context`

Dr. Context did not find supported agent instructions, package files, CI workflows, architecture docs, or command mentions.

This usually means the command ran outside a repository root or the repository has no supported context files yet.

### `no-agent-instructions`

Dr. Context found repo facts, such as `package.json`, lockfiles, CI workflows, or architecture docs, but did not find an agent-visible instruction file.

Add `AGENTS.md`, `CLAUDE.md`, or another supported instruction file with exact first reads and verification commands.

This finding suppresses other actionable warnings. Without an agent-visible instruction file, Dr. Context cannot tell whether missing commands are product problems or simply undocumented intent.

### `placeholder-test-script`

`package.json` contains a placeholder failing test script, for example:

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

Replace it with a real verification command or remove it. Dr. Context does not recommend placeholder test scripts as agent instructions.

### Direct verification commands

When a package script delegates directly to a known verification tool, Dr. Context suggests that tool command instead of guessing a package-manager command.

For example, this script:

```json
{
  "scripts": {
    "test": "forge test"
  }
}
```

Produces a suggestion to document `forge test`.

### `multiple-package-lockfiles`

Multiple JavaScript package manager lockfiles were found, for example `package-lock.json` and `yarn.lock`.

Keep one JavaScript package manager lockfile and remove stale lockfiles so agents use the intended package manager.

## Privacy and dogfood hygiene

Dr. Context is local and read-only by default. It does not call LLM or network APIs during scanner behavior.

Do not publish raw scans from private repositories. Public examples, tests, issues, and release notes should use synthetic fixtures or sanitized aggregate findings only.

See [`SECURITY.md`](SECURITY.md) for vulnerability reporting and token hygiene guidance.

## Output contracts

- Human-readable text is the default output.
- `--json` emits `schemaVersion: "drctx.report.v1"` for tool consumers.
- Findings include source-backed evidence, confidence, severity, and suggested fixes.
- Exit code `0`: no error-level findings.
- Exit code `1`: one or more error-level findings, or warnings in `--strict` mode.
- Exit code `2`: runtime/config/internal error.

## Non-goals

- Not a code reviewer.
- Not a docs generator.
- Not a repo packer.
- Not a prompt optimizer.
- No LLM calls in scanner behavior.
- No file writes by default.

## Project health

- See `CONTRIBUTING.md` for local development and TDD rules.
- See `docs/roadmap.md` for shipped and deferred work.
- See `docs/release.md` for the npm release checklist.
- See `SECURITY.md` for vulnerability reporting.
- See `CHANGELOG.md` for release notes once public releases begin.
