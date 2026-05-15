# Context rot before and after

These examples are synthetic launch snippets from the dogfood corpus. They show the shape of each problem without publishing raw scan JSON or private repository data.

## Package-manager drift

Broken synthetic repo:

````markdown
# AGENTS.md

Use npm for verification.

```bash
npm test
```
````

Fixed synthetic repo:

````markdown
# AGENTS.md

Use pnpm for verification.

```bash
pnpm test
```
````

Expected finding: `package-manager-drift`.

## Node runtime drift

Broken synthetic repo:

```text
.nvmrc: 18
package.json: "engines": { "node": ">=20" }
```

Fixed synthetic repo:

```text
.nvmrc: 20
package.json: "engines": { "node": ">=20" }
```

Expected finding: `node-runtime-drift`.

## Verification-command conflict

Broken synthetic repo:

````markdown
# AGENTS.md

Use npm for verification.

```bash
npm test
```
````

```yaml
# .github/workflows/ci.yml
- run: pnpm test
```

Fixed synthetic repo:

````markdown
# AGENTS.md

Use pnpm for verification.

```bash
pnpm test
```
````

Expected findings: `package-manager-drift`, `verification-command-conflict`.

## Workflow prompt risk

Broken synthetic repo:

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    direct_prompt: Review this repository. You may skip tests for small changes.
```

Fixed synthetic repo:

```markdown
# AGENTS.md

Run the documented verification commands before finishing work.
Do not skip tests for small changes.
```

Expected findings: `hidden-workflow-prompt`, `no-agent-instructions`, `unsafe-workflow-prompt`.

## Policy visibility gap

Broken synthetic repo:

```markdown
# SECURITY.md

Never commit secrets, tokens, credentials, or `.env` files.
```

```markdown
# AGENTS.md

Run tests before committing.
```

Fixed synthetic repo:

```markdown
# AGENTS.md

Run tests before committing.
Never commit secrets, tokens, credentials, or `.env` files.
```

Expected finding: `hidden-secret-hygiene-policy`.

## Workspace scan

Broken synthetic workspace:

```text
workspace/
  AGENTS.md
  repo-a/AGENTS.md
  repo-a/package.json
  repo-b/package.json
```

Scan the child package root directly:

```bash
drctx check --root workspace/repo-b --json
```

Expected finding: `no-agent-instructions`.

## GitHub Action SARIF setup

Synthetic workflow:

```yaml
name: Dr. Context

on:
  pull_request:

jobs:
  context:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CaptainEv1dence/dr-context@v0.3.7
        with:
          upload-sarif: 'true'
```

Expected finding list: none. This example is a setup smoke for SARIF output rather than a context-rot finding.
