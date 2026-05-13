# AGENTS.md

This repo builds **Dr. Context**, a deterministic local CLI for diagnosing AI coding-agent context rot.

## First reads

Before changing behavior, read:

1. `ARCHITECTURE.md` for module boundaries and data flow.
2. `docs/fixtures.md` before changing fixture behavior.
3. `README.md` for the user-facing product promise.
4. `docs/adr/0001-deterministic-first.md` for v0.1 determinism constraints.
5. `docs/adr/0002-checks-are-pure.md` for check purity boundaries.

## Build and test

Package manager: **pnpm**.

Commands:

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
```

Targeted tests:

```bash
pnpm exec vitest run tests/path/to/test.test.ts
```

## Architecture rules

- Keep CLI orchestration thin.
- Keep checks pure: checks consume `CheckContext` and return `Finding[]`.
- Checks must not read files, write files, log, or call process exit.
- Extractors preserve source evidence: file, line, and raw text when practical.
- Reporters render findings only. They must not infer new findings.

## Testing rules

- Use TDD for every behavior change.
- Every check needs positive and negative fixture coverage.
- Every finding needs evidence assertions in tests.
- The clean fixture must produce zero error findings.

## Safety and privacy

- v0.1 must not call network or LLM APIs.
- v0.1 must not write files by default.
- Never print secrets if fixture or user repos contain secret-like values.
- Never commit or push raw dogfood logs, full local scan JSON, private repository paths, private repository names, or detailed findings from local/private repositories.
- Public docs, tests, changelog entries, issues, and fixtures must use synthetic examples or sanitized aggregate product learnings only.
- Before any public push, verify that no secrets, `.env` files, credentials, runtime databases, logs, caches, `node_modules`, `dist`, coverage output, or other local-only artifacts are staged.
