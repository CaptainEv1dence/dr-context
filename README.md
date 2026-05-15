# Dr. Context

Diagnose and fix context rot before your coding agent reads it.

Dr. Context is a local, read-only CLI that checks `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, package files, CI workflows, and architecture docs for stale commands, missing verification instructions, and hidden source-of-truth docs.

## Install

```bash
npx dr-context
```

Or after install:

```bash
dr-context check
drctx check
```

The npm package exposes both binaries: `dr-context` and `drctx`.

Print the canonical context contract for a repository:

```bash
drctx manifest
drctx manifest --json
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
drctx check --workspace --root ../workspace --summary-only
drctx check --workspace --root ../workspace --max-findings 20
```

Parent workspace instructions are never inherited by default. To opt in during workspace scans:

```bash
drctx check --workspace --inherit-parent-instructions --root .
```

Inherited instruction sources are explicitly marked in structured output.

## Config and baselines

Use `.drctx.json` when a repository needs repeatable local and CI checks:

```json
{
  "exclude": ["vendor/**", "dist/**"],
  "strict": true,
  "baseline": ".drctx-baseline.json"
}
```

Create a baseline from the current accepted findings:

```bash
drctx baseline --root . --output .drctx-baseline.json
```

Run checks with the config:

```bash
drctx check --root . --config .drctx.json
```

Baseline files store stable finding fingerprints and root-relative source file paths. They do not store absolute repository roots or source text.

Known findings matched by the baseline are suppressed, so existing accepted context debt does not keep failing CI. New findings still report normally and still affect the exit code when they are errors, or warnings with `strict` enabled. Use `--show-suppressed` when you want visibility into what the baseline hid:

```bash
drctx check --root . --config .drctx.json --show-suppressed
```

Workspace limitation in 0.3.3: the root config is shared across workspace candidates. A baseline entry only applies to findings owned by that candidate path, and child config inheritance is not implemented yet.

Emit SARIF for GitHub code scanning or other SARIF consumers:

```bash
drctx check --sarif --root . > dr-context.sarif
```

Run in GitHub Actions:

```yaml
- uses: CaptainEv1dence/dr-context@v0.3.0
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

Found 3 finding(s).

1. ERROR package-manager-drift (high)
AGENTS.md:7 - Docs mention npm, but this repo uses pnpm

Evidence:
- AGENTS.md:7 mentions the npm-based test command.
- package.json declares packageManager: pnpm@11.1.1.
- pnpm-lock.yaml indicates pnpm.

Suggested fix:
- Replace the npm-based test command with the pnpm test command.

2. ERROR verification-command-conflict (high)
AGENTS.md:7 - Agent instructions run npm for "test", but CI uses pnpm

Evidence:
- AGENTS.md:7 tells agents to run the npm-based test command.
- .github/workflows/ci.yml:8 runs `pnpm test`.
- package.json defines script "test".
- package.json declares packageManager: pnpm@11.1.1.

Suggested fix:
- Replace the npm-based test command with the pnpm test command so agent verification matches CI and package.json.

3. ERROR node-runtime-drift (high)
.nvmrc:1 - Node runtime declarations conflict: 18 vs 20

Evidence:
- .nvmrc:1 declares Node 18.
- .github/workflows/ci.yml:6 declares Node 20.

Suggested fix:
- Align Node runtime declarations so version files, package engines, and CI setup-node use overlapping Node versions.
```

Dr. Context prefers false negatives over noisy guesses. It does not flag dynamic runtime values such as `lts/*` or matrix expressions, and it treats `pnpm`, `corepack pnpm`, and `corepack pnpm@<version>` as the same package-manager intent.

Another common output catches missing verification instructions without claiming a command conflict:

```text
1. WARNING ci-doc-command-mismatch (high)
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

- Multiple package-manager lockfile detection.
- Package manager drift between `packageManager`, lockfiles, setup actions, and deterministic command mentions.
- Node runtime drift between `.nvmrc`, `.node-version`, package engines, and GitHub Actions setup-node values.
- Verification command conflicts where agent-visible instructions disagree with CI and package scripts for the same script intent.
- Stale command references.
- Missing verification commands.
- CI/doc command mismatch.
- Architecture docs discovery and visibility.
- Coverage signals for repos with no supported context files or no agent-visible instructions.
- Placeholder failing test script detection.
- Multiple JavaScript lockfile detection.
- Candidate root discovery for folders that contain multiple repos or shared agent instructions.
- Workspace scanning with privacy-preserving aggregate JSON and text output.
- Context manifests with package manager, verification commands, first-read docs, CI commands, and agent instruction files.
- Workflow-embedded Claude Code Action prompt extraction for manifests and conservative findings.
- Cross-agent command drift, stale file reference, and unsafe instruction detection.
- Evidence-backed text and JSON reports.
- SARIF 2.1.0 reporting for code scanning integrations.

## Rule quality and policy visibility checks

0.3.6 adds conservative checks for instruction quality and policy visibility:

- Rule quality checks for oversized instruction surfaces and duplicated instruction blocks.
- Policy visibility checks for secret hygiene, destructive-action, generated-file, and workflow guidance that exists in canonical repo docs but is missing from agent-visible instructions.

## Supported context surfaces

Dr. Context treats these files as local repo context. It does not call vendor APIs or infer live agent state.

| Tool / convention | Surface | Status |
| --- | --- | --- |
| Generic coding agents | `AGENTS.md`, nested `AGENTS.md` | Supported |
| Claude Code | `CLAUDE.md` | Supported |
| GitHub Copilot | `.github/copilot-instructions.md` | Supported |
| GitHub Copilot | `.github/instructions/*.instructions.md` | Supported |
| Cursor | `.cursor/rules/**/*.mdc`, `.cursorrules` | Supported |
| Gemini | `GEMINI.md` | Supported |
| Explicit agent guide | `AGENT_GUIDE.md` | Supported |
| Windsurf / Continue / Aider / Cody | Known local rule/config files | Detection-only in 0.3.1 |
| Claude Code Action | `prompt`, `claude_args --system-prompt`, `claude_args --append-system-prompt`, legacy `custom_instructions`, legacy `direct_prompt` in GitHub workflows | Extracted into manifest and checked for conservative hidden/unsafe prompt findings. |
| Repo runtime and package-manager facts | `.nvmrc`, `.node-version`, `package.json`, JavaScript lockfiles, package-manager setup actions, deterministic README and agent-visible commands | Checked for deterministic drift in 0.3.5. Dynamic values are ignored instead of guessed. |
| Canonical policy docs | `SECURITY.md`, `CONTRIBUTING.md`, `docs/SECURITY.md`, `docs/CONTRIBUTING.md`, pull request templates, issue templates, and package metadata naming generated outputs | Checked for conservative policy visibility gaps in 0.3.6. |

### Workflow-embedded prompts

Dr. Context scans Claude Code Action prompt inputs in `.github/workflows/*.yml` and `.github/workflows/*.yaml`. It extracts current v1 `prompt`, `claude_args --system-prompt`, and `claude_args --append-system-prompt` values, plus legacy `custom_instructions` and `direct_prompt` values for older workflows.

`drctx manifest --json` includes the literal workflow prompt text. Review manifests from private repositories before publishing them, because workflow prompts can contain private guidance. Human-readable manifest text reports only prompt kind, source location, and action name, not prompt bodies.

Workflow prompt findings are conservative. Dr. Context flags explicit unsafe guidance such as skipped tests or `--no-verify`, and reports an info finding when agent context exists only as a hidden workflow prompt instead of a repo-visible instruction file.

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

Parent workspace instructions are never inherited unless `--inherit-parent-instructions` is passed during a workspace scan. When enabled, inherited instruction sources are marked as inherited in structured output instead of being rendered as child-local files.

## Manifest

Use `manifest` when an agent, CI job, or human needs the repository's context contract without findings:

```bash
drctx manifest --json --root .
```

Manifest JSON uses `schemaVersion: "drctx.manifest.v1"` and includes package manager evidence, agent instruction files, verification commands, first-read docs, CI command sources, and workflow-embedded prompt facts.

Workflow prompt facts in manifest JSON include literal prompt text. Human-readable manifest output lists workflow prompt kind, source location, and action name without printing prompt bodies.

Use `--path` to print the effective instruction files for a target file:

```bash
drctx manifest --path src/cli/main.ts
drctx manifest --path src/cli/main.ts --json
```

With path-scoped output, manifest JSON includes `targetPath` and `effectiveInstructionFiles`.

The `--path` value is resolved relative to `--root`, not the shell current working directory. Absolute paths are accepted only when they are inside `--root`. Output paths are normalized to root-relative paths.

Cursor rule metadata contributes to effective context deterministically. `alwaysApply: true` rules contribute to `effectiveInstructionFiles` for every target path. `alwaysApply: false` rules contribute only when their `globs` or `paths` metadata matches the requested target path.

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

### `node-runtime-drift`

Node runtime declarations disagree across deterministic sources such as `.nvmrc`, `.node-version`, `package.json` `engines.node`, or GitHub Actions `actions/setup-node` `node-version` values.

Dr. Context compares static majors such as `20`, `v20`, `20.11.1`, `20.x`, and minimum majors such as `>=20`. It stays quiet for dynamic or unsupported values such as `lts/*`, `node`, `latest`, matrix expressions, and environment variables.

### `package-manager-drift`

The repository has a canonical JavaScript package-manager intent, usually from `package.json` `packageManager` or a single lockfile, but another deterministic source points to a different manager.

For example, a repo with `packageManager: "pnpm@11.1.1"` and `pnpm-lock.yaml` should not tell agents to use npm for tests. `pnpm`, `corepack pnpm`, and `corepack pnpm@<version>` are normalized to the same intent.

### `verification-command-conflict`

Agent-visible instructions tell an agent to run a different package-manager command than CI and `package.json` use for the same verification script.

For example, if `package.json` declares `packageManager: "pnpm@11.1.1"`, CI runs `pnpm test`, and `AGENTS.md` tells agents to use npm for the same test script, Dr. Context reports a conflict and suggests the pnpm command. README-only weak evidence does not create this error by itself.

### `oversized-instruction-file`

An agent instruction surface is large enough to become hard for agents and humans to keep current. Generic agent instruction files report when they exceed 500 lines or 30 KB. Cursor scoped rules and workflow-embedded prompts use surface-specific thresholds.

Split oversized guidance into smaller scoped files or link to canonical docs instead of embedding long content.

### `duplicate-instruction-block`

The same normalized instruction block appears in more than one supported instruction surface or workflow prompt.

Dr. Context only reports deterministic overlap, such as repeated blocks with at least 5 non-empty lines or 300 normalized characters. It does not do semantic similarity matching.

### Policy visibility findings

Dr. Context reports conservative policy visibility gaps when a repository already documents a policy in canonical repo docs, but agent-visible instructions do not mention or link to that policy.

- `hidden-secret-hygiene-policy`: secret, token, credential, or `.env` handling is documented outside agent instructions.
- `hidden-destructive-action-policy`: destructive or irreversible action boundaries are documented outside agent instructions.
- `hidden-workflow-policy`: TDD, review, verification, changelog, release, or self-scan workflow guidance is documented outside agent instructions.
- `missing-generated-file-boundary`: package metadata names generated outputs such as `dist`, `build`, or `generated`, but agent-visible instructions do not say whether agents may edit those files directly.

These checks prefer false negatives over noisy guesses. They look for concrete canonical policy evidence first, then ask whether agent-visible instructions expose that policy.

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
