# Dr. Context demo

This page uses synthetic examples only. Do not copy private scan output, private paths, private repository names, credentials, tokens, or bug bounty target details into public docs.

## Bad Context

```text
AGENTS.md tells agents to run npm test.
package.json declares pnpm.
pnpm-lock.yaml confirms the repo uses pnpm.
```

That mismatch is context rot: an agent may follow stale instructions even though the repository facts point somewhere else.

## Try From This Repository Checkout

The fixture command below is for contributors who cloned Dr. Context itself.

Run:

```bash
corepack pnpm exec drctx check --root tests/fixtures/dogfood-corpus/package-manager-drift/before
```

Expected finding IDs include:

```text
package-manager-drift
```

Run the full synthetic corpus:

```bash
corepack pnpm exec vitest run tests/dogfoodCorpus.test.ts
```

For richer before/after examples, see [context rot before and after](examples/context-rot-before-after.md).

## Try On Your Own Repository

From another repository, run:

```bash
npx dr-context check --root .
```

If the output says no supported context was found, confirm you scanned the intended repository root and inspect recognized context with:

```bash
npx dr-context manifest --json --root .
```

`check` and `manifest` read local files and do not modify your repository.
