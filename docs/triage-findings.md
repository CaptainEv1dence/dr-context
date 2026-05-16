# Triage Dr. Context findings

Findings are the source of truth. Health is only a summary.

Use each finding's ID, severity, confidence, evidence, and suggested fix to decide what to change. Do not optimize the health score directly.

## Fix Order

1. Fix `error` findings with `high` confidence first.
2. Fix unsafe or hidden policy findings before normal polish.
3. Fix command and runtime drift before wording cleanup.
4. Review `warning` findings with the owner of the repo workflow.
5. Treat `info` findings as hygiene, not release blockers.

This order keeps agents away from stale commands, hidden safety rules, and runtime mismatches before spending time on lower-risk context polish.

## Context Quality Findings

`unindexed-context-history` means Dr. Context found enough dated `docs/superpowers` plans, specs, or reports that agents may struggle to identify what is current. Add `docs/superpowers/README.md`, `docs/superpowers/index.md`, or `docs/superpowers/current.md` with explicit status markers such as active, current, done, shipped, superseded, or superseded_by.

`missing-readme-verification` means README.md exists, CI has a local verification command, and the README does not tell humans or agents how to run a recognizable local check. Add a short verification section with the same local command CI uses.

For `hidden-architecture-doc`, an exact path such as `docs/ARCHITECTURE.md` is the lowest-noise fix. Generic wording such as "read the architecture docs" is useful context, but it still leaves agents guessing which file is authoritative.

`parent-policy-not-inherited` appears only in workspace scans when the requested root has parent agent instructions, but a child candidate is scanned without inheriting them. Enable parent instruction inheritance for workspace scans or add a root-relative link from each child instruction file to the parent policy.

`missing-generated-file-boundary` means package metadata or generation scripts name generated output such as `dist`, `build`, `storybook-static`, `playwright-report`, `test-results`, `coverage`, `typechain-types`, `src/generated`, or `generated/api`, but agent-visible instructions do not say whether generated files may be edited directly. Add a short generated-output rule before agents touch those files.

`missing-live-operation-boundary` means public docs or package metadata mention sensitive live-operation surfaces such as payment, checkout, sandbox, RPC, mainnet/testnet, smart contracts, trading, security research, or bug bounty work, but agent-visible instructions do not define both a local/offline/unit-test default and explicit approval before live, authenticated, state-changing, payment, checkout, RPC, production, account, secret, or token actions. Treat it as an info-level hygiene finding; precise agent-visible boundaries are usually the fix.

## Health Score

`summary.health` summarizes the current visible findings after baseline and suppression filtering.

```text
score = clamp(100 - errors * 35 - warnings * 10 - infos * 2, 0, 100)
```

Grades are labels over the score: `excellent` for `95..100`, `good` for `80..94`, `fair` for `60..79`, and `poor` for `0..59`.

Suppressed findings do not reduce the score, but `summary.health.suppressedCount` shows accepted debt. A clean-looking score with a large `suppressedCount` still deserves review during audits.

## Coverage Findings

Coverage findings explain what Dr. Context could or could not inspect. They are not proof that a repo is healthy.

- `no-scannable-context` means Dr. Context did not find supported context or repo fact files in the scanned root.
- `no-agent-instructions` means repo facts exist, but no recognized agent instruction file was found.

If either appears on a first run:

1. Confirm you scanned the intended repo root with `--root`.
2. Add or point Dr. Context at agent-visible instructions such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, or `.cursor/rules/**/*.mdc`.
3. Use `drctx manifest --json --root .` to inspect what Dr. Context recognized.
4. For parent folders containing multiple repos, scan the specific repo root or use workspace mode intentionally.

## First-run hints

Text output may include short next-step hints after clean scans or coverage findings. These hints are for humans only. JSON and SARIF reports remain finding-focused for automation.

## Scan Resource Diagnostics

`scanResource` is a report-level diagnostic, not a finding. It means Dr. Context skipped one or more context files because local resource limits were reached.

Resource diagnostics do not affect health, SARIF output, or exit code by themselves. They mean the findings are valid for files Dr. Context read, but the scan is incomplete for skipped files.

When `scanResource.hitLimit` is true:

1. Check skipped root-relative paths in JSON output.
2. Add `.drctx.json` excludes for generated, vendored, coverage, or build output areas.
3. Scan a narrower package root when the repository is a monorepo.
4. Raise limits in `.drctx.json` only after reviewing what was skipped.

Example config:

```json
{
  "exclude": ["packages/*/coverage/**", "packages/*/dist/**"],
  "maxFiles": 500,
  "maxFileBytes": 524288,
  "maxTotalBytes": 8388608
}
```

## Baselines And Suppressions

Use a baseline when adopting Dr. Context in an existing repo with accepted findings:

```bash
drctx baseline --root . --output .drctx-baseline.json
cat > .drctx.json <<'JSON'
{
  "baseline": ".drctx-baseline.json"
}
JSON
drctx check --root . --config .drctx.json
```

Use `--show-suppressed` during audits:

```bash
drctx check --root . --config .drctx.json --show-suppressed
```

Do not use baselines to hide new context rot. Regenerate a baseline only after reviewing accepted findings and confirming the remaining debt is intentional.
