# Safe Fixes Design

This is a design artifact only. It does not implement production behavior in this slice.

## Goal

Explore deterministic patch suggestions for narrow context-rot findings while preserving user control.

## Scope

- Future `drctx fix` or `drctx check --fix-dry-run` command.
- Unified diff output by default.
- Optional write mode only after dry-run behavior is trusted.
- First fixes limited to single-file, low-risk edits.

## Explicitly unsafe for first version

- Rewriting broad instruction files.
- Guessing package-manager migrations.
- Editing complex CI matrices.
- AI-generated remediation.
- Multi-file fixes.

## Candidate first fixes

- Replace stale package script names when package.json has exactly one matching current script and finding evidence names the stale script.
- Add a generated-file boundary sentence only when an instruction file already exists and package metadata clearly names generated directories.

## Safety rules

- No writes without explicit `--write`.
- No fix when evidence is ambiguous or dynamic.
- Diff output must be reviewable and stable.

## Recommendation

Do not implement before `drctx init`. Safe fixes should follow one successful dry-run-first write-mode command.
