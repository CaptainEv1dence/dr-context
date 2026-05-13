# Release Checklist

Dr. Context is not published yet. This checklist defines the release gate for the first npm release.

## Package identity

- Preferred npm package name: `dr-context`.
- Npm availability check on 2026-05-13 returned `404 Not Found` for `dr-context`, so the name appears available.
- Fallback package name: `@captainev1dence/dr-context`.
- Avoid `@drcontext/cli` unless the project intentionally creates and maintains a dedicated npm organization.

Do not rename the package or remove `"private": true` until the final package name is approved.

## Version policy

- Keep `version` at `0.0.0` during pre-release development.
- First intended public npm release: `0.1.0`.
- Update `CHANGELOG.md` from `Unreleased` to the release version during release prep.

## Publish readiness gate

Before any publish attempt:

- [ ] Confirm npm account or organization owner.
- [ ] Confirm package name: `dr-context` or fallback.
- [ ] Remove `"private": true` only after package name approval.
- [ ] Set version to `0.1.0` for the first public release.
- [ ] Confirm `publishConfig.access` is correct for the chosen package name.
- [ ] Confirm npm provenance is required for published artifacts.
- [ ] Configure trusted publishing with GitHub OIDC before automation publishes.
- [ ] Keep the release workflow disabled or absent until trusted publishing is configured.

## Local verification gate

Run these commands before creating a release PR or tag:

```bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run pack:dry-run
node dist/cli/main.js check --json --root .
node dist/cli/main.js discover --json --root .
```

Expected result:

- tests pass;
- typecheck passes;
- lint passes;
- build passes;
- package dry-run includes only intended publish files;
- self-scan has zero findings or explicitly approved findings;
- discover output contains no private paths beyond the requested root.

## Package contents gate

The package should include:

- `dist/**`
- `README.md`
- `LICENSE`
- `package.json`

The package must not include:

- `.env` files;
- credentials, keys, tokens, cookies, or private dumps;
- raw dogfood logs or local scan JSON;
- local repository paths or names from private dogfood;
- runtime databases, caches, logs, coverage output, or scratch files;
- test fixtures unless explicitly required for runtime behavior.

Use synthetic fixtures and sanitized aggregate findings for public examples.

## Dry-run commands

Local package inspection:

```bash
corepack pnpm run pack:dry-run
```

After `"private": true` is removed during release prep, also run an npm publish dry-run before publishing:

```bash
npm publish --dry-run --provenance
```

Do not run a real `npm publish` from a local machine unless the release plan explicitly approves local publishing. Prefer GitHub trusted publishing with provenance.

## GitHub trusted publishing

Before adding a release workflow:

- [ ] Create or claim the npm package.
- [ ] Configure npm trusted publishing for this GitHub repository.
- [ ] Restrict publish automation to tags or release workflow dispatch.
- [ ] Use OIDC provenance.
- [ ] Require CI to pass before publishing.
- [ ] Keep npm token secrets out of the repository if trusted publishing is available.

Release workflow automation is intentionally deferred until the package identity and npm trusted publishing setup are final.

## GitHub Actions Node 20 warning

GitHub Actions currently emits a non-failing Node 20 deprecation warning for:

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `pnpm/action-setup@v4`

CI is green, so do not churn the workflow only for this warning unless one of these is true:

- an updated action version with Node 24 support is verified;
- GitHub starts failing Node 20 actions;
- the release workflow requires the update.

Track this during release prep.
