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
- 0.3.6 rule-quality and safety/workflow hygiene checks:
  - `oversized-instruction-file` for supported instruction surfaces over conservative size thresholds.
  - `duplicate-instruction-block` for deterministic repeated instruction blocks across supported instruction surfaces and workflow prompts.
  - `hidden-secret-hygiene-policy`, `hidden-destructive-action-policy`, and `hidden-workflow-policy` when canonical repo docs define policies that agent-visible instructions do not expose.
  - `missing-generated-file-boundary` when package metadata names generated outputs but agent-visible instructions do not define the direct-edit boundary.
  - Narrow canonical policy surfaces only: security docs, contributing docs, pull request templates, issue templates, README, and package metadata signals.
- 0.3.7 dogfood corpus and launch assets:
  - Public synthetic dogfood corpus with exact expected finding IDs.
  - False-positive tracking format for synthetic and sanitized aggregate dogfood runs.
  - Before/after examples for package-manager drift, Node runtime drift, verification-command conflict, workflow prompt risk, policy visibility gaps, workspace scans, and GitHub Action SARIF setup.
- 0.3.8 context health summary:
  - Deterministic `summary.health` in scan and workspace JSON reports.
  - Text reports render `Context health: <score>/100 (<grade>)`.
  - Health is derived from visible finding counts after suppression filtering and includes aggregate `suppressedCount`.
  - Findings remain the source of truth for evidence, identity, SARIF, baselines, suppressions, and exit codes.
- 0.3.9 launch adoption polish:
  - README one-screen launch demo and trust boundaries.
  - Demo, triage, GitHub Action, finding reference, instruction-surface coverage, and launch checklist docs.
  - Public-safe docs cleanup and bundled Action deferral behind a reliability gate.
- 0.3.10 DX reliability:
  - Source-derived docs validation for emitted finding IDs and instruction-surface globs.
  - Local `drctx explain <finding-id>` command backed by static reference data.
- 0.3.11 first-run polish:
  - Human-readable first-run hints for clean scans and coverage findings.
  - Workspace non-summary text hint for inspecting each repository manifest.
  - JSON, SARIF, and exit-code behavior kept stable for automation.
- 0.3.12 dogfood context hardening:
  - Resource-safe context reads and bounded workspace inventory for large repositories.
  - Report-level scan resource diagnostics without changing finding IDs, SARIF, health, or exit-code semantics.
  - Monorepo package-root discovery guidance for package-level manifests and checks.
  - Context-quality checks for unindexed historical context, README verification guidance, exact architecture-doc references, parent policy visibility, and live-operation boundaries.
  - Expanded generated-output boundary detection with false-positive guards for bare build commands.
- `drctx init` is implemented on `main` for the next release, but is not available in the published `dr-context@0.3.12` npm package.

## Next

- `drctx init` release/adoption slice:
  - Publish the already-implemented `main` work in the next npm release.
  - Dry-run preview by default.
  - `--write` creates only missing `.drctx.json` and `AGENTS.md` starter files.
  - No overwrite, no network, no LLM, no GitHub Action generation.
- Pre-0.4 gap closure:
  - Refresh detection-only instruction surface coverage for GitHub custom agents, local Claude context, Junie, Jules, and skill files.
  - Keep `.mcp.json` as manifest/config context only until an MCP implementation plan exists.
  - Write explicit specs for `drctx init`, safe fixes, MCP/probes, integrations, child config inheritance, and cross-agent drift before production code.
- Pre-0.4 feature bets decomposition:
  - `docs/superpowers/plans/2026-05-15-pre-0.4-feature-bets-decomposition.md`.
  - Use after 0.3.12 published dogfood to decide the next product bet.
- 0.3.12 published dogfood:
  - Re-run the published package against the sanitized dogfood set used for the hardening plan.
  - Record only aggregate, public-safe outcomes and false-positive/false-negative themes.
- GitHub Action bundled implementation remains deferred:
  - Current composite Action contract is locked by tests.
  - Bundled JavaScript Action needs a separate implementation plan proving package contents, local Action smoke, Windows/Linux path behavior, and SARIF parity.
- Deferred context health work for 0.4+:
  - Score badges.
  - Persisted score trends, snapshots, and history.
  - Score-based exit gates such as a future minimum-health flag.
  - Hosted benchmarking or score services.
  - Telemetry-backed comparisons.
  - AI-generated health summaries.
- Deferred heuristics remain visible until dogfood data supports them:
  - `missing-instruction-example` is the safest candidate, but should start as narrow `info` only after launch docs and corpus examples make “good context” concrete.
  - `low-specificity-instruction` remains risky as a default finding; if explored, require strong generic-phrase matches plus absence of nearby commands, paths, or examples.
  - `copied-docs-in-instructions` should be renamed or narrowed before implementation. Prefer deterministic repo-local duplication signals over claims that text was copied from external docs.
- More context-file formats and stronger false-positive controls.

## Later

- Ruler and Repomix integrations should start as docs recipes before code dependencies.
- MCP context gate after scoped manifests, config, and baseline mode are stable.
- Optional safe fixes with `--dry-run` before any write mode.
- Optional agent view/probe simulation for Claude, Codex, Copilot, Cursor, OpenCode, and other adapters.
- Optional AI remediation and prompt generation on top of deterministic findings.
- Optional context compaction, session stale-assumption detector, handoff/checkpoint generation, Ruler/Repomix integrations, and safe fix suggestions.
