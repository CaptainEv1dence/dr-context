# Release Checklist

Dr. Context is published on npm as `dr-context`. This checklist defines the release gate for npm releases.

## Package identity

- Preferred npm package name: `dr-context`.
- Npm availability check on 2026-05-13 returned `404 Not Found` for `dr-context`; the package has since been claimed and published.
- Fallback package name: `@captainev1dence/dr-context`.
- Avoid `@drcontext/cli` unless the project intentionally creates and maintains a dedicated npm organization.

Do not rename the package without an explicit migration plan.

## Version policy

- Update `package.json` and `src/version.ts` to the new release version.
- Update `CHANGELOG.md` to the release version during release prep.
- `tests/packageMetadata.test.ts` guards that runtime `toolVersion` matches `package.json`.

## Publish readiness gate

Before any publish attempt:

- [ ] Confirm npm account or organization owner.
- [x] Confirm package name: `dr-context`.
- [x] Remove `"private": true` only after package name approval.
- [x] Set version to `0.1.0` for the first public release.
- [x] Confirm `publishConfig.access` is correct for the chosen package name.
- [x] Confirm runtime report `toolVersion` matches `package.json`.
- [x] Confirm npm provenance is required for published artifacts.
- [x] Configure trusted publishing with GitHub OIDC before automation publishes.
- [x] Add release workflow for tag/manual dispatch publishing after npm trusted publishing is configured.

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

Dr. Context self-scan is a required release gate, not an optional smoke test. Treat it like CI, typecheck, lint, build, and package dry-run.

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
- `action.yml`

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

Run an npm publish dry-run before publishing:

```bash
npm publish --dry-run --access public
```

Do not run a real `npm publish` from a local machine unless the release plan explicitly approves local publishing. Prefer GitHub Trusted Publishing with automatic provenance.

## GitHub trusted publishing

The repository contains `.github/workflows/release.yml`. It publishes only on `workflow_dispatch` or `v*` tags.

Trusted publishing is configured for future releases.

- [x] Create or claim the npm package.
- [x] Configure npm trusted publishing for this GitHub repository.
- [x] Restrict publish automation to tags or release workflow dispatch.
- [x] Use OIDC provenance.
- [x] Use Node 24 and npm automatic provenance generation for trusted publishing.
- [x] Run CI-equivalent checks in the release workflow before publishing.
- [x] Keep npm token secrets out of the repository if trusted publishing is available.
- [x] Skip publish when the package version already exists on npm.

Trusted publishing settings should point to:

- package: `dr-context`
- owner/repo: `CaptainEv1dence/dr-context`
- workflow: `release.yml`

The release workflow should use:

- `permissions.id-token: write`;
- `actions/checkout@v6`, `pnpm/action-setup@v6`, and `actions/setup-node@v6`;
- `actions/setup-node@v6` with `node-version: 24`;
- `registry-url: https://registry.npmjs.org`;
- `npm publish --access public` without an explicit `--provenance` flag.

For an already-published version, pushing a matching tag is safe: the workflow should run checks, detect that the version exists, and skip `npm publish`.

## Token hygiene

Trusted Publishing is the release path. Do not add npm tokens to GitHub secrets for normal releases.

If an npm token was pasted in chat, used manually, or stored locally for a publish attempt, revoke it after the release:

- npm UI: `https://www.npmjs.com/settings/captainev1dence/tokens`
- npm CLI: `npm token revoke <token-id>`

Do not copy token values into issues, docs, logs, commits, or release notes.

## Published package smoke test

On Windows, run published-package smoke tests from an isolated prefix so the local workspace does not shadow the temporary `npx` shims:

```powershell
$tmp = Join-Path $env:TEMP ("drctx-npx-smoke-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
npm exec --yes --prefix $tmp --package dr-context@0.1.7 -- dr-context --help
npm exec --yes --prefix $tmp --package dr-context@0.1.7 -- drctx --help
npm exec --yes --prefix $tmp --package dr-context@0.1.7 -- dr-context check --root D:\random\dr-context
npm exec --yes --prefix $tmp --package dr-context@0.1.7 -- dr-context discover --root D:\random\dr-context
Remove-Item -Recurse -Force $tmp
```

## GitHub Action smoke test

The repository root `action.yml` runs the published npm package through `npx` and can optionally upload SARIF.

Minimal usage:

```yaml
- uses: CaptainEv1dence/dr-context@v0.1.7
  with:
    root: .
```

Code scanning usage:

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v6
  - uses: CaptainEv1dence/dr-context@v0.1.7
    with:
      root: .
      upload-sarif: 'true'
```

## GitHub Actions runtime

Workflows use Node 24-compatible action majors:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `pnpm/action-setup@v6`

If a future action major changes inputs or runner requirements, verify with a push before tagging a release.
