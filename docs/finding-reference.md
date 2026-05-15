# Finding reference

Findings include an ID, default severity, confidence, source-backed evidence, and a suggested fix when Dr. Context can name a safe next action.

Use `drctx check --json` when tool consumers need exact evidence and source spans. The entries below describe the stable shape, not every possible message string.

Coverage findings such as `no-agent-instructions` and `no-scannable-context` are user-clarity signals. They prevent "nothing scanned" from looking like "everything is healthy."

## Commands and verification

### `package-manager-drift`

Default severity: error, except the related multiple-lockfile case uses `multiple-package-lockfiles`.

Confidence policy: inherits the canonical package manager evidence confidence.

When it fires: docs or agent-visible commands mention a JavaScript package manager that differs from the canonical package manager, or setup/lockfile evidence conflicts with the canonical manager.

Evidence source shape: command-mention, package-manager, optional lockfile, or setup-action entries with root-relative files and line spans when available.

Suggested fix: update commands and stale package manager evidence to match the canonical manager.

Related docs/examples: README launch demo, `docs/demo.md`, `docs/examples/context-rot-before-after.md`.

### `stale-package-script-reference`

Default severity: error.

Confidence policy: high; the check compares parsed package-manager script invocations with `package.json` scripts.

When it fires: a documented command such as a package-manager script invocation names a script that is not defined in `package.json`.

Evidence source shape: command-mention for the stale command and package-json-scripts for available script names.

Suggested fix: add the missing script, remove the stale command, or update the command to an available script.

Related docs/examples: `docs/demo.md`, `docs/triage-findings.md`.

### `missing-verification-command`

Default severity: warning.

Confidence policy: high; based on known verification script names in `package.json` that are not already represented in CI or agent instructions.

When it fires: a verification script such as test, lint, typecheck, check, or format:check exists but no agent-visible instruction mentions it.

Evidence source shape: package-json-script, agent-visible-command, and optional package-manager evidence.

Suggested fix: add the exact verification command to agent-visible instructions.

Related docs/examples: `docs/triage-findings.md`.

### `placeholder-test-script`

Default severity: warning.

Confidence policy: high; the check recognizes the common placeholder `test` script that exits with failure.

When it fires: `package.json` defines a placeholder failing test script instead of a real verification command.

Evidence source shape: package-json-script with the script source span.

Suggested fix: replace the placeholder with a real verification command or remove it.

Related docs/examples: `docs/triage-findings.md`.

### `ci-doc-command-mismatch`

Default severity: warning.

Confidence policy: high; CI command and package script facts are deterministic local facts.

When it fires: CI runs a verification or build script that agent-visible instructions do not mention.

Evidence source shape: ci-command, agent-visible-command, and package-json-script entries.

Suggested fix: add the CI-backed command to agent verification instructions so local agent checks match CI.

Related docs/examples: README GitHub Actions section, `docs/github-action.md`, `docs/triage-findings.md`.

### `verification-command-conflict`

Default severity: error.

Confidence policy: inherits the canonical package manager evidence confidence.

When it fires: agent instructions tell agents to run a verification script with one package manager while CI runs the same script with the canonical package manager.

Evidence source shape: agent-visible-command, ci-command, package-json-script, and package-manager entries.

Suggested fix: replace the agent instruction command with the canonical package-manager command.

Related docs/examples: README launch demo, `docs/demo.md`, `docs/github-action.md`.

### `agent-doc-command-drift`

Default severity: warning.

Confidence policy: high; the check compares parsed package-manager script invocations across agent instruction files.

When it fires: two or more agent instruction files mention the same package script using different package managers.

Evidence source shape: agent-command entries for each conflicting instruction command.

Suggested fix: update agent instruction files to use the same package manager and verification command.

Related docs/examples: `docs/triage-findings.md`.

## Runtime and package metadata

### `node-runtime-drift`

Default severity: error.

Confidence policy: high unless either compared runtime fact has medium confidence, then medium.

When it fires: deterministic Node runtime declarations do not overlap, such as an exact local version conflicting with CI setup-node or package engines.

Evidence source shape: two runtime-version entries with root-relative files and line spans.

Suggested fix: align Node declarations so version files, package engines, and CI use overlapping versions.

Related docs/examples: README launch demo, `docs/examples/context-rot-before-after.md`.

### `multiple-package-lockfiles`

Default severity: warning.

Confidence policy: high; lockfile names deterministically indicate package managers.

When it fires: more than one JavaScript package manager lockfile is present.

Evidence source shape: one lockfile entry per detected lockfile.

Suggested fix: keep one JavaScript package manager lockfile and remove stale lockfiles.

Related docs/examples: `docs/triage-findings.md`.

## Context coverage and visibility

### `coverage-signals`

Default severity: not emitted directly.

Confidence policy: not emitted directly.

When it fires: this is the source check family for coverage findings; emitted findings use `no-scannable-context` or `no-agent-instructions`.

Evidence source shape: see the emitted coverage finding IDs.

Suggested fix: see the emitted coverage finding IDs.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `no-scannable-context`

Default severity: info.

Confidence policy: high; no supported local context or repository fact files were found.

When it fires: Dr. Context finds no supported agent instructions, package files, CI workflows, architecture docs, commands, or workflow prompts.

Evidence source shape: workspace-discovery with no source span because there is no source file to point at.

Suggested fix: run at a repository root or add supported context files such as AGENTS.md, package.json, or CI workflows.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `no-agent-instructions`

Default severity: info.

Confidence policy: high; repository facts exist but no supported agent instruction file was discovered.

When it fires: Dr. Context finds repo facts but no agent-visible instruction file.

Evidence source shape: agent-instructions with no source span because the missing instruction file has no source location.

Suggested fix: add AGENTS.md or another supported agent instruction file with exact verification commands and first-read docs.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `hidden-architecture-doc`

Default severity: warning.

Confidence policy: high; based on discovered architecture docs and agent instruction content.

When it fires: an architecture source of truth exists but agent instructions do not mention its path or basename.

Evidence source shape: architecture-doc and agent-instructions entries.

Suggested fix: mention the architecture doc in agent-visible first-read instructions.

Related docs/examples: `docs/triage-findings.md`.

### `stale-file-reference`

Default severity: warning.

Confidence policy: high; based on local path mentions in agent instructions and repository file existence.

When it fires: agent instructions reference a local file path that does not exist, excluding placeholder paths such as path/to examples.

Evidence source shape: missing-local-file with the instruction source span.

Suggested fix: update or remove the missing file reference.

Related docs/examples: `docs/triage-findings.md`.

### `hidden-workflow-prompt`

Default severity: info.

Confidence policy: high; workflow prompt facts exist and no repo-visible agent instruction file was found.

When it fires: an agent prompt is embedded only in a workflow and no repo-visible agent instruction file exists.

Evidence source shape: workflow-prompt with workflow file and line span when available.

Suggested fix: add or reference canonical agent instructions in AGENTS.md or CLAUDE.md.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `hidden-secret-hygiene-policy`

Default severity: warning for strong policy in SECURITY.md or CONTRIBUTING.md, otherwise info.

Confidence policy: high; based on canonical policy file content and agent-visible policy content.

When it fires: canonical policy docs contain secret hygiene guidance that is not visible in agent instruction files.

Evidence source shape: canonical-secret-policy with the canonical policy file source.

Suggested fix: add the secret hygiene policy to agent-visible instructions or link to it from an agent-visible file.

Related docs/examples: `docs/triage-findings.md`, `docs/false-positive-tracking.md`.

### `hidden-destructive-action-policy`

Default severity: warning when the canonical policy contains a prohibition, otherwise info.

Confidence policy: high; based on canonical policy file content and agent-visible policy content.

When it fires: canonical policy docs contain destructive-action boundaries that are not visible in agent instruction files.

Evidence source shape: canonical-destructive-action-policy with the canonical policy file source.

Suggested fix: add destructive-action boundaries to agent-visible instructions or link to the canonical policy from an agent-visible file.

Related docs/examples: `docs/triage-findings.md`.

### `hidden-workflow-policy`

Default severity: info.

Confidence policy: high; based on canonical workflow policy content and agent-visible policy content.

When it fires: canonical policy docs contain TDD, review, verification, changelog, release, or self-scan guidance that is not visible in agent instruction files.

Evidence source shape: canonical-workflow-policy with the canonical policy file source.

Suggested fix: add workflow guidance to agent-visible instructions or link to the canonical policy from an agent-visible file.

Related docs/examples: `docs/triage-findings.md`.

### `missing-generated-file-boundary`

Default severity: info.

Confidence policy: high; based on package metadata naming generated outputs.

When it fires: package metadata points to generated outputs but agent-visible instructions do not say whether generated files should be edited directly.

Evidence source shape: generated-artifact-metadata with package metadata source.

Suggested fix: document the generated-file editing boundary in agent-visible instructions.

Related docs/examples: `docs/triage-findings.md`.

## Rule quality

### `oversized-instruction-file`

Default severity: info.

Confidence policy: high; based on line and byte thresholds for instruction files and embedded workflow prompts.

When it fires: an instruction surface is larger than the supported threshold, or an embedded workflow prompt exceeds the workflow prompt byte threshold.

Evidence source shape: instruction-size with file or workflow prompt source.

Suggested fix: split into smaller scoped files or link to canonical docs instead of embedding long content.

Related docs/examples: `docs/triage-findings.md`.

### `duplicate-instruction-block`

Default severity: info.

Confidence policy: high; based on normalized duplicate instruction blocks across instruction docs or workflow prompts.

When it fires: the same substantial normalized instruction block appears on multiple instruction surfaces.

Evidence source shape: duplicate-instruction-block entries pointing to the duplicated surfaces.

Suggested fix: keep the rule in one canonical place and reference it from narrower surfaces.

Related docs/examples: `docs/triage-findings.md`.

### `scoped-rules`

Default severity: not emitted directly.

Confidence policy: not emitted directly.

When it fires: this is the source check family for Cursor scoped rule findings; emitted findings use `invalid-scoped-rule-glob`, `scoped-rule-matches-no-files`, or `scoped-rule-too-broad`.

Evidence source shape: see the emitted scoped-rule finding IDs.

Suggested fix: see the emitted scoped-rule finding IDs.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `invalid-scoped-rule-glob`

Default severity: warning.

Confidence policy: high; based on local glob validation.

When it fires: a Cursor scoped rule declares an invalid glob.

Evidence source shape: scoped-rule-glob with the Cursor rule source.

Suggested fix: fix or remove the invalid scoped glob.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `scoped-rule-matches-no-files`

Default severity: info.

Confidence policy: medium; a valid glob matched no files in the current workspace snapshot.

When it fires: a Cursor scoped rule glob is valid but matches no workspace files.

Evidence source shape: scoped-rule-glob with the Cursor rule source.

Suggested fix: update the glob or remove the stale scoped rule.

Related docs/examples: `docs/instruction-surface-coverage.md`.

### `scoped-rule-too-broad`

Default severity: info.

Confidence policy: low; broadness is a deterministic signal but may be intentional.

When it fires: a Cursor scoped rule glob matches most files in a workspace with more than ten files.

Evidence source shape: scoped-rule-glob with match count, file count, and rule source.

Suggested fix: narrow the glob if the rule is not intended to apply to most files.

Related docs/examples: `docs/instruction-surface-coverage.md`.

## Workflow prompt safety

### `unsafe-workflow-prompt`

Default severity: warning.

Confidence policy: medium; based on deterministic unsafe phrase matches with explicit negation handling.

When it fires: a workflow-embedded agent prompt includes guidance such as skipping tests, ignoring lint, using no-verify, or force pushing, without a nearby negation pattern.

Evidence source shape: workflow-prompt with workflow file and line span when available.

Suggested fix: move safe agent guidance into repo-visible instructions and replace bypass guidance with explicit verification expectations.

Related docs/examples: `docs/triage-findings.md`.

### `unsafe-agent-instructions`

Default severity: warning.

Confidence policy: medium; based on deterministic unsafe phrase matches with explicit negation handling.

When it fires: an agent instruction line includes guidance such as skipping tests, ignoring lint, using no-verify, or force pushing, without a nearby negation pattern.

Evidence source shape: unsafe-guidance with the instruction file line span.

Suggested fix: replace bypass guidance with explicit verification and safety expectations.

Related docs/examples: `docs/triage-findings.md`, `docs/false-positive-tracking.md`.
