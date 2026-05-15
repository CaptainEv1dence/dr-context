# Changelog

All notable changes to Dr. Context will be documented in this file.

The format follows Keep a Changelog-style sections. The project has not published a stable release yet.

## 0.3.8 - Unreleased

### Added

- Add deterministic context health summaries to scan and workspace JSON/text reports, including score, grade, severity penalties, and suppressed finding counts.

### Changed

- Keep findings as the source of truth: health summaries do not affect finding identity, baselines, suppressions, SARIF output, or exit codes.

## 0.3.7 - 2026-05-15

### Added

- Add a synthetic dogfood corpus with expected finding IDs for public-safe scanner examples.
- Add false-positive tracking docs for synthetic and sanitized aggregate dogfood runs.
- Add launch-ready before/after examples for context rot findings and GitHub Action SARIF setup.

## 0.3.6 - 2026-05-15

### Added

- Add `oversized-instruction-file` findings for instruction surfaces that exceed conservative size thresholds.
- Add `duplicate-instruction-block` findings for deterministic repeated instruction blocks across supported instruction surfaces and workflow prompts.
- Add `hidden-secret-hygiene-policy`, `hidden-destructive-action-policy`, and `hidden-workflow-policy` findings when canonical repo docs define policies that are missing from agent-visible instructions.
- Add `missing-generated-file-boundary` findings when package metadata names generated outputs but agent-visible instructions do not say whether agents should edit them directly.

### Changed

- Keep 0.3.6 rule-quality checks conservative by deferring broader heuristic checks such as `low-specificity-instruction`, `copied-docs-in-instructions`, and `missing-instruction-example` until dogfood data supports them.

## 0.3.5 - 2026-05-15

### Added

- Add `node-runtime-drift` findings for deterministic Node version conflicts across `.nvmrc`, `.node-version`, `package.json` `engines.node`, and GitHub Actions `setup-node` values.
- Add `package-manager-drift` findings for conflicts between canonical JavaScript package-manager intent and lockfiles, setup actions, or deterministic command mentions.
- Add `verification-command-conflict` findings when agent-visible instructions tell agents to run a different package-manager command than CI and `package.json` use for the same verification script.

### Changed

- Normalize static Node versions and package-manager command intent before comparing evidence, including `corepack pnpm` and `corepack pnpm@<version>` as `pnpm` command intent.
- Keep ambiguous or dynamic runtime evidence quiet, such as `lts/*`, `node`, `latest`, matrix expressions, environment variables, and unsupported semver forms.
- Fold docs-command package-manager mismatches into the broader `package-manager-drift` finding ID to avoid duplicate package-manager findings.

## 0.3.4 - 2026-05-15

### Added

- Extract Claude Code Action workflow prompt inputs, including current v1 `prompt`, `claude_args --system-prompt`, and `claude_args --append-system-prompt`, into manifests.
- Extract legacy `custom_instructions` and `direct_prompt` workflow prompt inputs for older Claude workflows.
- Flag unsafe workflow-embedded agent prompts with source-backed findings.
- Flag hidden workflow-only prompt context when no repo-visible agent instruction file exists.

## 0.3.3 - 2026-05-15

### Added

- Add `.drctx.json` config loading for shared include, exclude, strict, baseline, and suppression settings.
- Add `drctx baseline` to record accepted existing findings as stable fingerprints.
- Add suppression-aware text and JSON reporting so CI can stay clean while known findings remain visible on demand.

### Changed

- SARIF and exit-code logic ignore baseline-suppressed findings by default.
- Workspace scans share the root config across candidates, while baseline entries apply only to findings owned by each candidate path.

## 0.3.2 - 2026-05-14

### Added

- Add `drctx manifest --path` effective instruction files.
- Add opt-in workspace parent instruction inheritance with `--inherit-parent-instructions`.
- Add deterministic Cursor scoped rule metadata support.
- Add conservative scoped-rule findings for invalid, stale, or broad scoped patterns.

### Changed

- Manifest JSON can include `targetPath` and `effectiveInstructionFiles` when path-scoped output is requested.

## 0.3.1 - 2026-05-14

### Added

- Add a central instruction surface registry for agent context files.
- Add support for Gemini, Copilot path instructions, Cursor MDC rules, exact `AGENT_GUIDE.md` files, and detection-only entries for additional agent tools.
- Extract Makefile, justfile, Taskfile, README command, Node runtime, package engine, and setup-action facts.
- Classify CI commands so manifests distinguish verification commands from shell plumbing.

### Changed

- Manifest instruction files now include tool and scope metadata.
- Manifest verification command detection ignores shell control/output plumbing lines.

## 0.3.0 - 2026-05-14

### Added

- Add `drctx manifest` with `drctx.manifest.v1` JSON output for the repository context contract.
- Add cross-agent command drift detection across agent instruction files.
- Add stale local file reference detection for agent-visible instructions.
- Add unsafe instruction detection for bypass guidance such as skipped tests or `--no-verify`.
- Add GitHub workflow annotations for SARIF findings.
- Add workspace text output controls: `--summary-only` and `--max-findings`.

### Changed

- Package manager extraction now supports compact `package.json` formatting and scoped package manager values more safely.
- Harden GitHub Action input handling, SARIF annotation escaping, and invalid SARIF diagnostics.
- Enforce Dr. Context self-dogfood in CI and release workflows.

### Fixed

- Keep stale local path checks inside the requested scan root.
- Include missing first-read references in manifest output.
- Limit cross-agent command drift evidence to agent instruction files.
- Print a truncation notice when workspace text output omits findings via `--max-findings`.

## 0.2.0 - 2026-05-14

### Added

- Add `drctx check --workspace` to discover and scan candidate roots under one directory with privacy-preserving aggregate output.
- Add `schemaVersion: "drctx.workspace-report.v1"` for workspace JSON reports.
- Add GitHub Action job summaries with SARIF result counts.
- Add OpenSSF Scorecard workflow with SARIF upload.

### Changed

- Generate `src/version.ts` from `package.json` before builds to avoid manual version drift.

### Fixed

- Print an explicit GitHub Action diagnostic when the CLI fails before producing SARIF.

## 0.1.9 - 2026-05-14

### Fixed

- Run the GitHub Action's published CLI from an isolated npm prefix so local workspaces and GitHub runners resolve the `dr-context` binary reliably.
- Skip SARIF upload when the Action fails before producing a non-empty SARIF file.
- Keep self-dogfood pinned to the latest published package instead of a just-bumped release version, avoiding release-publish races on `main` pushes.

## 0.1.8 - 2026-05-14

### Added

- Add `--version` CLI output.
- Add `--sarif` reporting for SARIF 2.1.0 / GitHub code scanning integrations.
- Add a composite GitHub Action wrapper that runs the published CLI and can upload SARIF.

### Changed

- Treat Dr. Context self-scan as a documented quality gate alongside tests, typecheck, lint, build, and package dry-run.

## 0.1.7 - 2026-05-14

### Fixed

- Preserve `Usage: dr-context` in published package help when npm shims invoke `dist/cli/main.js`.

## 0.1.6 - 2026-05-14

### Fixed

- Remove an unsupported `actions/setup-node@v4` release workflow input that produced a non-failing warning.
- Show the invoked binary name in CLI help so `dr-context --help` reports `Usage: dr-context` and `drctx --help` reports `Usage: drctx`.

### Security

- Document that any manually used or pasted npm tokens should be revoked after switching releases to Trusted Publishing.

## 0.1.5 - 2026-05-13

### Fixed

- Match npm trusted publishing docs by using Node 24 and letting npm generate provenance automatically.

## 0.1.4 - 2026-05-13

### Fixed

- Opt GitHub Actions JavaScript actions into Node 24 and restore npm registry setup for trusted publishing.

## 0.1.3 - 2026-05-13

### Fixed

- Use npm trusted publishing without token-based setup-node registry configuration.
- Add a test guard that keeps runtime `toolVersion` in sync with `package.json`.

## 0.1.2 - 2026-05-13

### Fixed

- Prefer the `dr-context` binary name in package metadata so `npx dr-context` resolves the package-name binary on Windows.

## 0.1.1 - 2026-05-13

### Fixed

- Add `dr-context` binary alias so `npx dr-context` works in addition to `drctx`.

## 0.1.0 - 2026-05-13

### Added

- Deterministic scanner pipeline for AI-agent context hygiene.
- Package manager mismatch detection.
- Stale package script reference detection.
- Missing verification command detection.
- Hidden architecture doc detection.
- CI/doc command mismatch detection.
- `drctx check --root <path>` for scanning another repository without changing directories.
- `no-scannable-context` info finding for paths with no supported context or repo fact files.
- `no-agent-instructions` info finding for repos with facts but no supported agent-visible instruction file.
- `placeholder-test-script` warning for placeholder failing `npm init`-style test scripts.
- `multiple-package-lockfiles` warning for conflicting JavaScript lockfile evidence.
- Direct verification command suggestions for scripts that call tools such as `forge test`.
- `drctx discover` for finding candidate roots in folders with multiple repos or shared agent instructions.
- Roadmap documentation for v0.1 blockers and deferred workspace features.
- Release checklist documentation for npm package identity, provenance, trusted publishing, dry runs, and privacy gates.
- Text and JSON reporting with source-backed evidence.

### Changed

- `drctx discover --json` now redacts the absolute requested root as `<requested-root>` and keeps candidate paths relative.
- Verification command suggestions now prefer `packageManager` metadata or lockfile evidence instead of defaulting blindly to pnpm.
- `no-agent-instructions` now suppresses actionable warnings because the repo has no supported agent-visible instruction surface to fix yet.

### Security

- Documented dogfood privacy hygiene: do not publish raw scans from private repositories; use synthetic fixtures or sanitized aggregate findings for public examples.
