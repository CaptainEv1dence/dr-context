# Roadmap

This roadmap tracks shipped and deferred work for Dr. Context. The scanner should stay deterministic, local, read-only, and evidence-backed.

## Shipped

- Deterministic local scanner.
- npm package `dr-context` with Trusted Publishing.
- SARIF reporter and GitHub Action wrapper.
- Candidate discovery.
- Workspace aggregate scan.
- OpenSSF Scorecard workflow.
- Context manifest command.
- Cross-agent command drift, stale file reference, and unsafe instruction checks.
- GitHub annotations and workspace output controls.
- 0.3.1 implementation plan: `docs/superpowers/plans/2026-05-14-0.3.1-surface-coverage-manifest-cleanup.md`.
- Supported context surface registry for Copilot, Cursor, Gemini, exact `AGENT_GUIDE.md`, and detection-only local agent rule files.
- Repo fact extraction for Makefile, justfile, Taskfile, README commands, Node runtime, package engines, and setup actions.
- CI command classification and README supported context surface matrix.
- 0.3.2 scoped effective context implementation:
  - Path-scoped manifest output, for example `drctx manifest --path backend/src/api.ts`.
  - Effective instruction files for target paths.
  - Opt-in parent/child agent-instruction inheritance for workspace scans.
  - Deterministic Cursor scoped rule metadata support.
  - Conservative invalid, stale, and broad scoped-rule findings.
- 0.3.3 config and baseline mode:
  - `.drctx.json` config for shared include, exclude, strict, baseline, and suppression settings.
  - `drctx baseline` for stable fingerprints of accepted findings.
  - Suppression-aware text, JSON, SARIF, and exit-code behavior.
  - Workspace baseline scoping by owning candidate path, with child config inheritance still deferred.
- 0.3.4 workflow-embedded prompt scanning:
  - Claude Code Action current v1 `prompt`, `claude_args --system-prompt`, and `claude_args --append-system-prompt` extraction.
  - Legacy Claude workflow `custom_instructions` and `direct_prompt` extraction for older workflows.
  - Conservative unsafe workflow prompt and hidden workflow-only prompt findings.

## Completed In Branch

- 0.3.5 drift and verification-command conflict checks, pending release:
  - `node-runtime-drift` for deterministic Node version conflicts between `.nvmrc`, `.node-version`, `package.json` engines, and GitHub Actions setup-node values.
  - `package-manager-drift` for conflicts between canonical package-manager intent, lockfiles, setup actions, and deterministic command mentions.
  - `verification-command-conflict` when agent-visible instructions disagree with CI and package scripts for the same verification script.
  - Static Node and package-manager command normalization, including `corepack pnpm` and `corepack pnpm@<version>` as `pnpm` intent.

## Next

- Pre-0.4 context quality umbrella spec:
  - `docs/superpowers/specs/2026-05-15-pre-0.4-context-quality-design.md`.
- 0.3.6 rule-quality and safety/workflow hygiene checks:
  - Oversized agent instruction files.
  - Duplicate instruction blocks.
  - Low-specificity guidance such as generic “best practices” rules, with conservative severity.
  - Copied docs instead of references and missing canonical examples.
  - Secret hygiene, destructive-action, generated/dist, planning, TDD, review, and verification visibility gaps when repo docs already define those policies.
- 0.3.7 adoption and launch assets before broader integrations:
  - Public synthetic dogfood corpus and false-positive tracking.
  - Before/after examples for AGENTS.md, CI/doc mismatch, package-manager drift, workflow prompt risks, workspace scans, and GitHub Action SARIF setup.
- 0.3.8 or 0.4.0 context health gate:
  - Context health badge or score trend only if findings are stable enough to summarize without hiding raw evidence.
- More context-file formats and stronger false-positive controls.

## Later

- Optional bundled JavaScript Action to avoid npm install-on-demand.
- MCP context gate after scoped manifests, config, and baseline mode are stable.
- Optional safe fixes with `--dry-run` before any write mode.
- Optional agent view/probe simulation for Claude, Codex, Copilot, Cursor, OpenCode, and other adapters.
- Optional AI remediation and prompt generation on top of deterministic findings.
- Optional context compaction, session stale-assumption detector, handoff/checkpoint generation, and Ruler/Repomix integrations.
