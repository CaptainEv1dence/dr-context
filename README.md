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

## Quick start

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
```

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

## v0.1 scope

- Package manager mismatch.
- Stale command references.
- Missing verification commands.
- CI/doc command mismatch.
- Architecture docs discovery and visibility.
- Evidence-backed text and JSON reports.

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
- No LLM calls in v0.1.
- No file writes by default.

## Project health

- See `CONTRIBUTING.md` for local development and TDD rules.
- See `SECURITY.md` for vulnerability reporting.
- See `CHANGELOG.md` for release notes once public releases begin.
