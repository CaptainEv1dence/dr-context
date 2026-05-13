# Changelog

All notable changes to Dr. Context will be documented in this file.

The format follows Keep a Changelog-style sections. The project has not published a stable release yet.

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
