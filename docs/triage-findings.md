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
