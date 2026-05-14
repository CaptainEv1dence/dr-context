# Roadmap Implementation Design

Date: 2026-05-14
Status: draft for user review
Project: Dr. Context

## Purpose

This spec turns the post-0.3.0 roadmap into an implementation design. It covers the requested roadmap items, but intentionally splits them into release slices so Dr. Context does not ship broad, noisy heuristics in one risky change.

Dr. Context should remain deterministic, local, read-only by default, evidence-backed, and conservative. False positives are worse than missing weak findings.

## Product goal

Move Dr. Context from a root-level context scanner to a scoped context hygiene engine:

```text
repo facts + agent instruction surfaces + path-scoped effective context
  -> deterministic findings
  -> manifest/check/SARIF/Action/docs
```

The scanner should answer two questions:

1. What context will an AI coding agent likely read for this repo or target path?
2. Is that context current, specific, safe, and aligned with repo facts and CI?

## Non-goals for this roadmap wave

- No LLM calls in scanner checks.
- No network calls in scanner checks.
- No write mode except future explicit safe fixes with `--dry-run` first.
- No broad code review or style review.
- No exact vendor runtime introspection yet. Agent probe mode comes later.
- No MCP server until scoped manifests, config, and baseline are stable.

## Release slices

### 0.3.1: Surface Coverage + Manifest Cleanup

Goal: recognize real instruction surfaces and repo facts before adding more complex checks.

#### Instruction surfaces

Add a central instruction surface registry and support:

- `AGENTS.md` and nested `AGENTS.md`.
- `CLAUDE.md`.
- `.github/copilot-instructions.md`.
- `.github/instructions/*.instructions.md`.
- `.cursor/rules/**/*.mdc`.
- `GEMINI.md`.
- `AGENT_GUIDE.md` and explicit README references telling agents to read an agent guide.
- Registry entries for Windsurf, Continue, Aider, and Cody, even if first support is detection-only with clear docs.

Each instruction fact should include:

```ts
type AgentInstructionDocFact = {
  path: string;
  tool: 'agents' | 'claude' | 'copilot' | 'cursor' | 'gemini' | 'workflow' | 'unknown';
  scope: 'repo' | 'path' | 'nested' | 'workflow';
  appliesTo?: string[];
  metadata?: Record<string, string | string[] | boolean>;
  source: SourceSpan;
};
```

#### Repo fact expansion

Extract more repo facts:

- `Makefile` targets.
- `justfile` targets.
- `Taskfile.yml` tasks.
- README command blocks.
- `.nvmrc`.
- `.node-version`.
- `package.json` `engines`.
- GitHub setup action versions, especially `actions/setup-node` and package-manager setup actions.

Do not create warnings from these facts in 0.3.1 unless an existing high-confidence check already applies. 0.3.1 is mostly data coverage.

#### CI command classification

Keep raw CI command facts, but add classification:

```ts
type CiCommandClassification =
  | 'verification'
  | 'install'
  | 'setup'
  | 'publish'
  | 'shell-control'
  | 'output-plumbing'
  | 'unknown';
```

Manifest should avoid treating shell plumbing as canonical verification context:

- `if`
- `else`
- `fi`
- `echo`
- `exit`
- heredoc/control-only shell lines

Raw CI commands may remain in JSON if useful, but canonical `verificationCommands` should be clean.

#### Docs

Add README support matrix with source-backed notes for:

- AGENTS.md.
- CLAUDE.md.
- GitHub Copilot instructions.
- Cursor rules.
- Gemini instructions.
- Claude Code Action embedded prompts, marked planned if not implemented yet.

### 0.3.2: Scoped Effective Context

Goal: model what instructions apply to a target path.

#### Parent/child inheritance

Add opt-in workspace inheritance:

```bash
drctx check --workspace --inherit-parent-instructions
```

Rules:

- Never silently inherit parent instructions.
- Mark inherited sources explicitly.
- Preserve evidence showing both parent and child instruction files.
- Prefer false negatives over noisy inherited findings.

#### Cursor nested rules

Support nested `.cursor/rules/**/*.mdc` rules by directory.

#### Path-scoped manifest

Add:

```bash
drctx manifest --path backend/src/api.ts
```

The manifest should include:

- `targetPath`.
- `effectiveInstructionFiles`.
- inherited parent files.
- nested/path-specific rules.
- why each instruction applies.

#### Invalid scoped globs

For scoped instruction surfaces, detect:

- invalid glob syntax.
- scoped rule matches no files.
- scoped rule unexpectedly matches too broadly.

These should start as warnings or info depending on confidence.

### 0.3.3: Workflow Prompt Scanning + Drift Checks

Goal: catch agent instructions embedded in workflows and obvious version drift.

#### Claude Code Action prompt facts

Scan GitHub workflow steps using Claude Code Action for:

- `custom_instructions`.
- `claude_args: --append-system-prompt`.
- `prompt`.
- `direct_prompt`.

Represent these as workflow-scoped instruction facts, not plain CI commands.

#### Drift checks

Add deterministic drift checks for:

- Node/runtime version drift between README/docs, `.nvmrc`, `.node-version`, `package.json` engines, and GitHub Actions.
- Package-manager version drift between docs, `packageManager`, lockfiles, and setup actions.
- Broader verification command conflicts across instruction surfaces.

Severity rule:

- `error` only when repo evidence is deterministic and agent instructions clearly contradict it.
- `warning` for likely drift.
- `info` for advisory version mismatch with weak evidence.

### 0.3.4: Rule Quality + Safety and Workflow Hygiene

Goal: add high-signal quality checks without becoming a generic writing critic.

#### Rule quality checks

Add conservative checks for:

- Oversized instruction files, especially Cursor rules above documented 500-line guidance.
- Duplicate instruction blocks across surfaces.
- Low-specificity guidance such as `use best practices`, `write clean code`, or `make it robust`.
- Copied docs instead of links/references to canonical docs.
- Repeated blocks and context budget/noise estimates.
- Missing canonical examples when instructions say to follow a style or pattern.

Most findings in this slice should be `info` or `warning`, not `error`.

#### Safety and workflow hygiene

Add checks only when repo evidence shows the workflow or policy exists:

- Secret hygiene instruction gaps.
- Destructive-action boundary gaps.
- Generated/dist do-not-edit guidance.
- Planning, TDD, review, and verification policy visibility.

Example: if `CONTRIBUTING.md` requires TDD, but agent-visible instructions never mention tests or verification, Dr. Context can report a visibility gap with source evidence.

### 0.3.5: Adoption Assets

Goal: make Dr. Context easier to trust and adopt before config/baseline.

Add:

- Public/synthetic dogfood corpus.
- False-positive tracking doc.
- Before/after examples for AGENTS.md, Copilot instructions, Cursor rules, CI/doc mismatch, workspace scans, and GitHub Action SARIF setup.
- Context health badge/score prototype, likely docs-only first.

### 0.4.0: Config + Baseline

Goal: let messy real repos adopt Dr. Context without breaking CI on old known debt.

Add:

- `dr-context.config.json` or equivalent.
- per-check ignores.
- path/source-specific suppressions.
- baseline create/update/check.
- fail only on new findings when a baseline is provided.

Config and baseline should come after 0.3.x finding shapes are more stable.

### 0.5.0: MCP Context Gate

Goal: let agents ask Dr. Context for verified context before coding.

Prerequisites:

- Scoped manifest.
- Config.
- Baseline.
- Stable findings.

Initial MCP tools:

- `check_context_health`.
- `get_context_manifest`.
- `explain_finding` only if needed.

## Core architecture changes

### Instruction surface registry

Add a single registry for known instruction surfaces. Avoid scattering file globs across extractors and discovery.

```ts
type InstructionSurfaceDefinition = {
  id: string;
  tool: 'agents' | 'claude' | 'copilot' | 'cursor' | 'gemini' | 'workflow' | 'unknown';
  patterns: string[];
  scope: 'repo' | 'path' | 'nested' | 'workflow';
};
```

### Broader facts, not overloaded command mentions

Add explicit fact types instead of forcing everything into `CommandMention`:

- `BuildTargetFact`.
- `RuntimeVersionFact`.
- `WorkflowPromptFact`.
- `ScopedRuleFact`.
- `ReadmeCommandFact`.

### Effective context resolver

Add a pure resolver:

```ts
resolveEffectiveContext(facts, targetPath?)
```

It should return:

- instruction files that apply.
- inherited parent files.
- scoped/nested rules.
- workflow prompts when relevant.
- evidence explaining why each applies.

This resolver powers:

- `manifest --path`.
- workspace inheritance.
- future MCP context gate.

### CI command classifier

Classify CI commands during extraction/normalization, not inside checks or reporters.

Reporters should render existing facts only. They should not infer command meaning.

### Check layering

Keep checks pure. Group checks mentally by confidence:

- High confidence: stale commands, missing files, invalid globs, deterministic version drift.
- Medium confidence: duplicate/conflicting docs, copied docs, broad scoped rules.
- Info: vague guidance, missing examples, oversized docs.

## Testing strategy

Every slice needs tests before implementation.

For each new check:

- positive fixture.
- negative fixture.
- source/evidence assertion.
- suggestion assertion when applicable.
- clean fixture remains clean.

New fixture families:

```text
tests/fixtures/copilot-instructions/
tests/fixtures/copilot-path-instructions/
tests/fixtures/cursor-nested-rules/
tests/fixtures/workflow-claude-prompt/
tests/fixtures/runtime-version-drift/
tests/fixtures/makefile-justfile-taskfile/
tests/fixtures/vague-agent-rules/
tests/fixtures/scoped-effective-context/
```

For every slice, run at least:

```bash
corepack pnpm test
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
node dist/cli/main.js check --json --root .
```

Release slices also require package dry-run, npm publish dry-run, GitHub workflow checks, and published-package smoke if released.

## Privacy and safety rules

- No raw private workspace paths in public docs, fixtures, or commits.
- Public dogfood must use public or synthetic repos only.
- Baselines and manifests should preserve redaction behavior for workspace scans.
- Scanner must not access paths outside the requested root.
- Workflow prompt scanning must not print secrets. It should report source locations and normalized findings.

## Open decisions for implementation planning

These should be resolved in the implementation plan, not during this design:

1. Exact config filename: `dr-context.config.json`, `dr-context.yml`, or both.
2. Exact fingerprint algorithm for baseline mode.
3. Exact score/badge formula.
4. How much Cursor MDC metadata to parse in the first slice.
5. Whether Windsurf/Continue/Aider/Cody support starts as detection-only or full parsing.

## Spec self-review

- Placeholder scan: no TBD/TODO placeholders remain.
- Internal consistency: release slices follow dependency order: surfaces, scoped context, workflow prompts/drift, quality checks, adoption, config/baseline, MCP.
- Scope check: full roadmap is too large for one implementation pass, so it is split into 0.3.1 through 0.5.0.
- Ambiguity check: implementation choices that need more detail are listed as open decisions for the implementation plan.
