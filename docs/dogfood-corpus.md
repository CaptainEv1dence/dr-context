# Synthetic dogfood corpus

The dogfood corpus under `tests/fixtures/dogfood-corpus/` is public-safe proof that Dr. Context catches reproducible context rot without exposing private dogfood data.

Every case is synthetic. The examples are small repository-shaped fixtures that preserve the shape of real context problems while avoiding private paths, private repository names, raw private scan output, secrets, credentials, customer data, and bug bounty target details.

## What a case contains

Each case directory has:

- a synthetic `before` repository root;
- an optional synthetic `after` repository root;
- a `drctx.expected.json` file with the exact expected finding IDs.

The `before` root shows the context rot. The `after` root shows the smallest public-safe fix when a paired fix is useful.

## Expected JSON

Expected files use `schemaVersion` value `drctx.dogfood-case.v1`:

```json
{
  "schemaVersion": "drctx.dogfood-case.v1",
  "case": "package-manager-drift",
  "description": "Synthetic pnpm repo whose agent instructions tell agents to use npm.",
  "before": {
    "root": "before",
    "findingIds": ["package-manager-drift"]
  },
  "after": {
    "root": "after",
    "findingIds": []
  }
}
```

`findingIds` is an exact sorted list after default suppression and filtering. If a case intentionally expects multiple findings, list every expected ID explicitly. Do not store raw scan JSON in fixtures.

## Run the corpus test

Run the public corpus smoke with:

```bash
corepack pnpm exec vitest run tests/dogfoodCorpus.test.ts
```

The test discovers corpus cases, scans each declared root, and compares the actual finding IDs to the expected list. This makes the examples useful as both launch material and regression coverage.

## Privacy rules

Public docs and fixtures must stay synthetic or sanitized.

Do not add:

- private repository names;
- local or private filesystem paths;
- raw private scan JSON or copied private findings;
- secrets, credentials, tokens, cookies, or `.env` values;
- customer data, issue details, organization identifiers, or bug bounty target details.

Use synthetic names such as `synthetic-package-manager-drift` and root-relative fixture paths. If a real dogfood run teaches something useful, translate it into a small synthetic case or a sanitized aggregate note before committing it.
