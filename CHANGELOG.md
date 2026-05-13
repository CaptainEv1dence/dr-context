# Changelog

All notable changes to Dr. Context will be documented in this file.

The format follows Keep a Changelog-style sections. The project has not published a stable release yet.

## Unreleased

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
- Direct verification command suggestions for scripts that call tools such as `forge test`.
- Text and JSON reporting with source-backed evidence.

### Changed

- Verification command suggestions now prefer `packageManager` metadata or lockfile evidence instead of defaulting blindly to pnpm.

### Security

- Documented dogfood privacy hygiene: do not publish raw scans from private repositories; use synthetic fixtures or sanitized aggregate findings for public examples.
