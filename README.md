# Dr. Context

Diagnose and fix context rot before your coding agent reads it.

## Your repo can lie to AI agents

Dr. Context checks the files your coding agents read before they start coding.

Example context rot:

```text
AGENTS.md:        run npm test
package.json:     "packageManager": "pnpm@11.1.1"
CI workflow:      pnpm test
.nvmrc:           18
setup-node:       20
```

Dr. Context reports the mismatch with source-backed evidence:

```text
Found 3 finding(s).

ERROR package-manager-drift
AGENTS.md says npm, but this repo uses pnpm.

ERROR verification-command-conflict
Agent instructions run npm for test, but CI runs pnpm test.

ERROR node-runtime-drift
.nvmrc uses Node 18, but CI uses Node 20.
```

Fix the context once, then every coding agent starts from cleaner instructions.

```bash
npx dr-context check --root .
```

Start here:

- [Demo and before/after examples](docs/demo.md)
- [Detailed before/after examples](docs/examples/context-rot-before-after.md)
- [Synthetic dogfood corpus](docs/dogfood-corpus.md)
- [How to triage findings](docs/triage-findings.md)
- [GitHub Action setup](docs/github-action.md)
- [Finding reference](docs/finding-reference.md)
- [Recognized instruction surfaces](docs/instruction-surface-coverage.md)
- [False-positive and privacy-safe tracking](docs/false-positive-tracking.md)

## Trust boundaries

Dr. Context scans local files and reports evidence-backed findings.

- Local scan: no hosted service is required.
- Read-only scan: `check` and `manifest` do not modify files.
- No LLM at analysis runtime.
- No external docs or internet comparison during scan.
- Not a code reviewer, docs generator, repo packer, or prompt optimizer.

The scanner reports context hygiene issues: stale commands, conflicting instructions, hidden docs, unsafe guidance, and instruction-surface visibility gaps.

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

### Start a new repo safely

Use `drctx init` to preview or create starter context files for a repository.

Preview starter files without writing anything:

```bash
drctx init --root .
```

Create only missing starter files:

```bash
drctx init --root . --write
```

`drctx init` never overwrites existing files. It creates `.drctx.json` when missing and creates `AGENTS.md` only when no recognized instruction surface exists.

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

Workspace limitation: the root config is shared across workspace candidates. A baseline entry only applies to findings owned by that candidate path, and child config inheritance is not implemented yet.

### Large repositories and monorepos

Dr. Context uses bounded local reads so a large monorepo cannot exhaust the Node heap. If a root scan reports skipped context files in `scanResource` or too much aggregate context, findings are valid for the files Dr. Context read, but the scan may be incomplete for skipped files or too broad to act on directly.

Tune limits in `.drctx.json` when CI needs repeatable behavior:

```json
{
  "exclude": ["packages/*/generated/**", "packages/*/vendor/**", "packages/*/dist/**"],
  "maxFiles": 500,
  "maxFileBytes": 524288,
  "maxTotalBytes": 8388608
}
```

For large monorepos, discover package roots and scan narrower roots:

```bash
drctx discover --root . --max-depth 4
drctx manifest --root packages/app
drctx check --root packages/app
```

## Context health

Scan JSON and workspace JSON reports include a deterministic `summary.health` object for trend-friendly summaries. Findings remain the source of truth: health never changes finding IDs, fingerprints, SARIF results, baseline matching, suppression matching, or exit codes.

Human-readable output may include next-step hints; JSON and SARIF stay stable for automation.

Health is calculated from visible findings after baseline and suppression filtering:

```text
score = clamp(100 - errors * 35 - warnings * 10 - infos * 2, 0, 100)
```

Grades are stable labels over the score: `excellent` for `95..100`, `good` for `80..94`, `fair` for `60..79`, and `poor` for `0..59`. Suppressed findings do not reduce the score, but `summary.health.suppressedCount` keeps accepted context debt visible.

The health object is an aggregate summary only:

```json
{
  "summary": {
    "errors": 1,
    "warnings": 2,
    "infos": 3,
    "health": {
      "score": 39,
      "grade": "poor",
      "penalties": {
        "errors": 35,
        "warnings": 20,
        "infos": 6
      },
      "suppressedCount": 4
    }
  }
}
```

Use findings and evidence to decide what to fix. Use health to summarize the current run, compare aggregate quality over time, or make dashboards outside the scanner.

See [How to triage findings](docs/triage-findings.md) for fix order and baseline guidance.

## GitHub Actions

Run Dr. Context in CI and optionally upload SARIF to GitHub code scanning.

Emit SARIF for GitHub code scanning or other SARIF consumers:

```bash
drctx check --sarif --root . > dr-context.sarif
```

Run in GitHub Actions:

```yaml
- uses: CaptainEv1dence/dr-context@v0.3.9
  with:
    root: .
    upload-sarif: 'true'
```

See [GitHub Action setup](docs/github-action.md) for minimal setup, SARIF upload, permissions, and troubleshooting.

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
- Deterministic current-run context health summaries in JSON and text reports.
- Evidence-backed text and JSON reports.
- SARIF 2.1.0 reporting for code scanning integrations.

Dr. Context prefers false negatives over noisy guesses. It does not flag dynamic runtime values such as `lts/*` or matrix expressions, and it treats `pnpm`, `corepack pnpm`, and `corepack pnpm@<version>` as the same package-manager intent.

## Reference docs

- [Finding reference](docs/finding-reference.md)
- [Recognized instruction surfaces](docs/instruction-surface-coverage.md)
- [GitHub Action setup](docs/github-action.md)
- [False-positive and privacy-safe tracking](docs/false-positive-tracking.md)
- [Synthetic dogfood corpus](docs/dogfood-corpus.md)
- [Detailed before/after examples](docs/examples/context-rot-before-after.md)
- Explain a finding locally: `drctx explain package-manager-drift`

## Workflow-embedded prompts

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

## Privacy and dogfood hygiene

Dr. Context is local and read-only by default. It does not call LLM or network APIs during scanner behavior.

Do not publish raw scans from private repositories. Public examples, tests, issues, and release notes should use synthetic fixtures or sanitized aggregate findings only.

Public examples:

- [Synthetic dogfood corpus](docs/dogfood-corpus.md)
- [Before/after context rot examples](docs/examples/context-rot-before-after.md)
- [False-positive tracking](docs/false-positive-tracking.md)

See [`SECURITY.md`](SECURITY.md) for vulnerability reporting and token hygiene guidance.

## Output contracts

- Human-readable text is the default output.
- `--json` emits `schemaVersion: "drctx.report.v1"` for tool consumers.
- Findings include source-backed evidence, confidence, severity, and suggested fixes.
- `summary.health` is a precomputed deterministic summary in JSON reports; text reports render it as `Context health: <score>/100 (<grade>)`.
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
