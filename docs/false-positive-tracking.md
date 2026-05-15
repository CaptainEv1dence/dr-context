# False-positive tracking

Dr. Context does not collect telemetry. For public dogfood and release work, track accepted findings and false positives with a small local JSON ledger instead of raw private scan output.

This format is for docs, fixtures, and tests only. Do not add network calls, telemetry upload behavior, or automatic collection around it.

## Statuses

- `accepted`: the finding is real, but the team accepts it for now.
- `false-positive`: the finding is not useful and should influence future scanner tuning.
- `fixed`: the finding was addressed in the repo or fixture.

## Format

Use `schemaVersion` value `drctx.false-positive-ledger.v1` and one entry per tracked finding:

```json
{
  "schemaVersion": "drctx.false-positive-ledger.v1",
  "entries": [
    {
      "case": "accepted-debt-example",
      "findingId": "multiple-package-lockfiles",
      "status": "accepted",
      "reason": "Synthetic migration window keeps both lockfiles temporarily.",
      "nextReview": "2026-06-01"
    }
  ]
}
```

`reason` should be meaningful enough for a reviewer to understand why the status was chosen without needing raw scan output.

## Privacy

Never store private repository names, private paths, secrets, credentials, customer data, raw private findings, or raw private scan output in public ledgers.

Use synthetic cases or sanitized aggregate notes. Keep examples public-safe and avoid copying local paths, issue details, customer labels, bug bounty targets, or organization-specific identifiers into docs, fixtures, tests, changelogs, or release notes.

Health-score sanity notes may record aggregate counts such as total findings, score range, grade, suppressed finding count, and whether the score matched reviewer intuition. Do not store raw private scan JSON, private paths, private repo names, raw logs, raw finding details, or issue-specific evidence in health notes.
