# Fixtures

Fixtures are tiny production-shaped repositories used to test scanner behavior.

## Required fixtures

| Fixture | Expected finding |
|---|---|
| `pnpm-repo-with-npm-docs` | package manager mismatch |
| `missing-package-script` | stale package script |
| `ci-doc-mismatch` | command contradicts CI |
| `missing-verification-command` | missing verification commands |
| `hidden-architecture-doc` | architecture visibility gap |
| `clean-repo` | no error findings |

Every fixture assertion should check finding id, severity, confidence, source file, evidence text, and JSON report shape.
