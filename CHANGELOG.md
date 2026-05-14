# Changelog

All notable changes to Dr. Context will be documented in this file.

The format follows Keep a Changelog-style sections. The project has not published a stable release yet.

## 0.1.9 - 2026-05-14

### Fixed

- Run the GitHub Action's published CLI from an isolated npm prefix so local workspaces and GitHub runners resolve the `dr-context` binary reliably.
- Skip SARIF upload when the Action fails before producing a non-empty SARIF file.

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
