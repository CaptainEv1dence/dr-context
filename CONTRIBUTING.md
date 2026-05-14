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
pnpm run pack:dry-run
node dist/cli/main.js check --json --root .
```

Dr. Context must dogfood itself. Treat the self-scan as a required quality gate on the same level as tests, typecheck, lint, build, and package dry-run. The expected self-scan result is zero findings unless a finding is explicitly reviewed and accepted.

Targeted tests:

```bash
pnpm exec vitest run tests/path/to/test.test.ts
```

## Development rules

- Use TDD for behavior changes.
- Add or update fixtures for every new check.
- Keep checks pure. Checks must not read files directly.
- Preserve evidence in findings.
- Prefer false negatives over noisy false positives.

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
node dist/cli/main.js check --json --root .
```

The package should include built `dist/**`, `README.md`, and `LICENSE`, and should not include fixtures, local logs, caches, or secrets.
