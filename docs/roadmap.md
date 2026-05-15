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
- 0.3.5 drift and verification-command conflict checks:
  - `node-runtime-drift` for deterministic Node version conflicts between `.nvmrc`, `.node-version`, `package.json` engines, and GitHub Actions setup-node values.
  - `package-manager-drift` for conflicts between canonical package-manager intent, lockfiles, setup actions, and deterministic command mentions.
  - `verification-command-conflict` when agent-visible instructions disagree with CI and package scripts for the same verification script.
  - Static Node and package-manager command normalization, including `corepack pnpm` and `corepack pnpm@<version>` as `pnpm` intent.

## Completed

- 0.3.6 rule-quality and safety/workflow hygiene checks:
  - `oversized-instruction-file` for supported instruction surfaces over conservative size thresholds.
  - `duplicate-instruction-block` for deterministic repeated instruction blocks across supported instruction surfaces and workflow prompts.
  - `hidden-secret-hygiene-policy`, `hidden-destructive-action-policy`, and `hidden-workflow-policy` when canonical repo docs define policies that agent-visible instructions do not expose.
  - `missing-generated-file-boundary` when package metadata names generated outputs but agent-visible instructions do not define the direct-edit boundary.
  - Narrow canonical policy surfaces only: security docs, contributing docs, pull request templates, issue templates, README, and package metadata signals.

## Completed

- 0.3.7 dogfood corpus and launch assets:
  - Public synthetic dogfood corpus with exact expected finding IDs.
  - False-positive tracking format for synthetic and sanitized aggregate dogfood runs.
  - Before/after examples for package-manager drift, Node runtime drift, verification-command conflict, workflow prompt risk, policy visibility gaps, workspace scans, and GitHub Action SARIF setup.

## Next

- Pre-0.4 context quality umbrella spec:
  - `docs/superpowers/specs/2026-05-15-pre-0.4-context-quality-design.md`.
- 0.3.8 or 0.4.0 context health gate:
  - Context health badge or score trend only if findings are stable enough to summarize without hiding raw evidence.
- Deferred heuristics remain visible until dogfood data supports them:
  - `low-specificity-instruction`.
  - `copied-docs-in-instructions`.
  - `missing-instruction-example`.
- More context-file formats and stronger false-positive controls.

## Later

- Optional bundled JavaScript Action to avoid npm install-on-demand.
- MCP context gate after scoped manifests, config, and baseline mode are stable.
- Optional safe fixes with `--dry-run` before any write mode.
- Optional agent view/probe simulation for Claude, Codex, Copilot, Cursor, OpenCode, and other adapters.
- Optional AI remediation and prompt generation on top of deterministic findings.
- Optional context compaction, session stale-assumption detector, handoff/checkpoint generation, and Ruler/Repomix integrations.
