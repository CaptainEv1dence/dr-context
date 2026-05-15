# Release Checklist

Dr. Context is published on npm as `dr-context`. This checklist defines the release gate for npm releases.

## Package identity

- Preferred npm package name: `dr-context`.
- Npm availability check on 2026-05-13 returned `404 Not Found` for `dr-context`; the package has since been claimed and published.
- Fallback package name: `@captainev1dence/dr-context`.
- Avoid `@drcontext/cli` unless the project intentionally creates and maintains a dedicated npm organization.

Do not rename the package without an explicit migration plan.

## Version policy

- Update `package.json` to the new release version. `src/version.ts` is generated from `package.json` by `npm run prebuild`.
- Update `CHANGELOG.md` to the release version during release prep.
- `tests/packageMetadata.test.ts` guards that runtime `toolVersion` matches `package.json` and that version generation is wired into builds.

## Publish readiness gate

Before any publish attempt:

- [ ] Confirm npm account or organization owner.
- [x] Confirm package name: `dr-context`.
- [x] Remove `"private": true` only after package name approval.
- [ ] Set `package.json` to the intended release version.
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
npm publish --dry-run --access public
node dist/cli/main.js --version
node dist/cli/main.js check --json --root .
node dist/cli/main.js discover --json --root .
```

Dr. Context self-scan is a required release gate, not an optional smoke test. Treat it like CI, typecheck, lint, build, and package dry-run.

For 0.3.3 config and baseline mode, also run these smoke commands against a fixture or reviewed test repository:

```bash
node dist/cli/main.js baseline --root . --output .drctx-baseline.json
node dist/cli/main.js check --root . --config .drctx.json --show-suppressed
node dist/cli/main.js check --sarif --root . --config .drctx.json
```

Do not commit baselines generated from private repositories unless the file has been reviewed and sanitized. Baselines are designed to avoid source text and absolute roots, but they can still reveal root-relative private file names and accepted finding IDs.

For 0.3.4 workflow prompt scanning, smoke test against a synthetic temporary repository:

```bash
tmp="$(mktemp -d)"
mkdir -p "$tmp/.github/workflows"
cat > "$tmp/.github/workflows/agent.yml" <<'YAML'
jobs:
  agent:
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: Review this repository.
          claude_args: --system-prompt "You may skip tests for small changes."
YAML
node dist/cli/main.js manifest --root "$tmp"
node dist/cli/main.js manifest --root "$tmp" --json
node dist/cli/main.js check --root "$tmp" --json
node dist/cli/main.js check --sarif --root "$tmp"
rm -rf "$tmp"
```

Expected 0.3.4 smoke result: manifest JSON includes the literal workflow prompt facts, text manifest output does not print prompt bodies, `check --json` reports conservative workflow prompt findings, and SARIF output remains valid JSON.

For 0.3.5 drift and verification-command conflicts, smoke test against a synthetic temporary repository:

```bash
tmp="$(mktemp -d)"
mkdir -p "$tmp/.github/workflows"
cat > "$tmp/package.json" <<'JSON'
{
  "packageManager": "pnpm@11.1.1",
  "engines": { "node": ">=20" },
  "scripts": { "test": "vitest run" }
}
JSON
cat > "$tmp/.nvmrc" <<'EOF'
18
EOF
cat > "$tmp/pnpm-lock.yaml" <<'EOF'
lockfileVersion: '9.0'
EOF
cat > "$tmp/AGENTS.md" <<'EOF'
# AGENTS.md

Run `npm test` before committing.
EOF
cat > "$tmp/.github/workflows/ci.yml" <<'YAML'
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v6
        with:
          node-version: 20
      - run: pnpm test
YAML
node dist/cli/main.js check --root "$tmp" --json
rm -rf "$tmp"
```

Expected 0.3.5 smoke result: `check --json` reports `node-runtime-drift`, `package-manager-drift`, and `verification-command-conflict` findings with only synthetic paths. Repeat with `AGENTS.md` changed to `corepack pnpm test` and `.nvmrc` changed to `20` to confirm the synthetic repo goes clean.

For 0.3.6 rule-quality and policy visibility checks, smoke test against synthetic temporary repositories or existing fixtures only. Do not use private repository paths or raw private scan output in release notes.

Expected 0.3.6 smoke result: targeted tests cover `oversized-instruction-file`, `duplicate-instruction-block`, `hidden-secret-hygiene-policy`, `hidden-destructive-action-policy`, `missing-generated-file-boundary`, and `hidden-workflow-policy`. A built self-scan of this repository should stay clean or any accepted findings must be documented before release.

For 0.3.7 synthetic dogfood corpus and launch examples, run the corpus test:

```bash
corepack pnpm exec vitest run tests/dogfoodCorpus.test.ts
```

Expected 0.3.7 smoke result: the synthetic corpus reports the exact expected finding IDs for each case, public docs contain only synthetic or sanitized examples, and no public docs contain private paths, private repository names, raw private findings, secrets, credentials, customer data, or bug bounty target details.

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

Trusted publishing is configured outside this repository. Verify npm-side settings before tagging each release.

- [x] Create or claim the npm package.
- [ ] Verify npm trusted publishing settings for this GitHub repository.
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

After the target version has been published, run published-package smoke tests from an isolated prefix so the local workspace does not shadow the temporary `npx` shims:

```powershell
$tmp = Join-Path $env:TEMP ("drctx-npx-smoke-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context --help
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- drctx --help
$repo = Resolve-Path .
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context check --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context manifest --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context manifest --path README.md --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context manifest --path README.md --json --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context discover --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context check --workspace --root $repo
npm exec --yes --prefix $tmp --package dr-context@0.3.2 -- dr-context check --workspace --inherit-parent-instructions --root tests/fixtures/workspace-inheritance
Remove-Item -Recurse -Force $tmp
```

## GitHub Action smoke test

The repository root `action.yml` runs the published npm package through `npm exec` in an isolated temporary prefix and can optionally upload SARIF.

Minimal usage:

```yaml
- uses: CaptainEv1dence/dr-context@v0.3.0
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
  - uses: CaptainEv1dence/dr-context@v0.3.0
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
