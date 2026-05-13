# Roadmap

This roadmap tracks the remaining work before the first public npm release. It is intentionally small: v0.1 should stay deterministic, local, read-only, and evidence-backed.

## v0.1 blockers

- [ ] Reserve or publish the final npm package name.
  - Preferred: `dr-context`.
  - Fallback: `@captainev1dence/dr-context`.
- [ ] Remove `"private": true` only during release prep, after package identity is final.
- [ ] Cut `CHANGELOG.md` from `Unreleased` to `0.1.0` during release prep.
- [ ] Configure npm trusted publishing with GitHub OIDC before automated publishing.
- [ ] Require npm provenance for published artifacts.
- [ ] Keep raw dogfood logs and local scan JSON out of commits, issues, release notes, and package contents.
- [ ] Track the GitHub Actions Node 20 deprecation warning. Do not change CI solely for the warning while it remains green.

## v0.1 nice-to-have polish

- [ ] Keep `drctx discover --json` privacy-preserving by omitting absolute `root` from discover reports.
- [ ] Dogfood `drctx discover` on local parent folders and record only sanitized aggregate output.
- [ ] Add a short release PR checklist if release prep becomes multi-step.

## Deferred past v0.1

- Batch workspace scan.
- Parent/child agent-instruction inheritance.
- SARIF reporter.
- GitHub Action annotations.
- Automated npm release workflow.
