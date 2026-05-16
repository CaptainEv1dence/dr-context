# drctx init Design

This is a design artifact only. It does not implement production behavior in this slice.

## Goal

Help repositories adopt Dr. Context by previewing starter config and instruction templates without overwriting existing files.

## Scope

- Future `drctx init` command.
- Dry-run by default.
- Optional `--write` creates only missing files.
- No overwrite unless a later `--force` design is approved.

## Candidate outputs

- `.drctx.json` with conservative defaults.
- `AGENTS.md` starter only when no recognized agent instruction file exists.
- Optional GitHub Action workflow only behind a separate explicit flag in a later plan.

## Safety rules

- No writes by default.
- Print every planned file path.
- Never include secrets, credentials, or local machine paths in templates.
- Keep templates generic and short.
- No network or LLM calls.

## Required tests before implementation

- Dry-run writes nothing.
- Existing `.drctx.json` is not overwritten.
- Existing `AGENTS.md` is not overwritten.
- `--write` creates only missing files.
- Paths are root-relative on Windows and POSIX.

## Recommendation

Implement after pre-0.4 gap closure if published dogfood shows adoption friction rather than scanner correctness issues.
