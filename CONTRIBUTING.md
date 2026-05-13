# Contributing

Thanks for helping build Dr. Context.

## Local setup

```bash
pnpm install
```

## Checks

```bash
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run build
```

Targeted tests:

```bash
pnpm exec vitest run tests/path/to/test.test.ts
```

## Development rules

- Use TDD for behavior changes.
- Add or update fixtures for every new check.
- Keep checks pure. Checks must not read files directly.
- Preserve evidence in findings.
- Prefer false negatives over noisy false positives in v0.1.

## Package checks

Before publishing or cutting a release candidate, inspect the package tarball:

```bash
pnpm run pack:dry-run
```

If `pnpm` is not on PATH, use Corepack:

```bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
```

The package should include built `dist/**`, `README.md`, and `LICENSE`, and should not include fixtures, local logs, caches, or secrets.
