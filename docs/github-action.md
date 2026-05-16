# GitHub Action setup

Dr. Context can run in GitHub Actions as a local repository scan and can optionally upload SARIF to GitHub code scanning.

## Minimal check

```yaml
name: Dr. Context

on:
  pull_request:
  push:
    branches: [main]

jobs:
  dr-context:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: CaptainEv1dence/dr-context@v0.3.9
        with:
          root: .
```

## SARIF upload

Use SARIF upload when you want findings to appear in GitHub code scanning.

```yaml
name: Dr. Context

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  dr-context:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: CaptainEv1dence/dr-context@v0.3.9
        with:
          root: .
          upload-sarif: 'true'
```

The SARIF input is `upload-sarif`. Do not use `sarif` as the input name.

## Runtime constraints

The scanner itself is local and deterministic. It reads repository files and reports source-backed findings.

The current composite Action may contact npm to install the selected `dr-context` package version before scanning. The scan does not call LLMs or external services.

`check` is read-only. It does not modify repository files.

## Reliability notes

The current wrapper is a composite Action. It runs `npm exec` to install and execute the selected `dr-context` npm package before scanning.

The Action tag pins the wrapper version. The `version` input selects the npm package version that the wrapper installs and runs.

CI needs npm registry access before scanning starts. After installation, the scan remains local, deterministic, and read-only. It does not call LLMs or external services.

Bundled Action work is separate from the current composite wrapper. Before a bundled Action can replace it, the replacement must preserve the current inputs, SARIF output, GitHub annotations, job summary, and exit-code behavior.

## Version pinning

Pin the Action to a release tag for repeatability:

```yaml
- uses: CaptainEv1dence/dr-context@v0.3.9
```

Replace `v0.3.9` with the release tag you are validating when preparing a future release.

Use the `version` input only when you intentionally want the Action wrapper to run a different published npm package version than the pinned Action tag.

## Troubleshooting

If SARIF upload fails with a permission error, confirm the workflow has:

```yaml
permissions:
  contents: read
  security-events: write
```

If the Action cannot install Dr. Context, confirm the selected release tag and optional `version` input refer to a published package version.

If no findings appear, run the same scan locally with:

```bash
npx dr-context check --root .
```

For exact finding evidence and source spans, use JSON output:

```bash
npx dr-context check --json --root .
```
