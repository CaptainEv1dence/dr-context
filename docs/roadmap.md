# Roadmap

This roadmap tracks shipped and deferred work for Dr. Context. The scanner should stay deterministic, local, read-only, and evidence-backed.

## Shipped

- Deterministic local scanner.
- npm package `dr-context` with Trusted Publishing.
- SARIF reporter and GitHub Action wrapper.
- Candidate discovery.
- Workspace aggregate scan.
- OpenSSF Scorecard workflow.
- Context manifest command.
- Cross-agent command drift, stale file reference, and unsafe instruction checks.
- GitHub annotations and workspace output controls.

## Next

- 0.3.1 implementation plan: `docs/superpowers/plans/2026-05-14-0.3.1-surface-coverage-manifest-cleanup.md`.
- Support official agent instruction surfaces discovered in ecosystem research:
  - GitHub Copilot repository instructions: `.github/copilot-instructions.md`.
  - GitHub Copilot path-specific instructions: `.github/instructions/*.instructions.md`.
  - Cursor project rules: `.cursor/rules/**/*.mdc`.
  - Additional agent surfaces from local planning: Windsurf, Continue, Aider, Cody, `GEMINI.md`, and explicit `AGENT_GUIDE.md`-style files.
  - Explicit agent-guide references such as README text that tells agents to read `AGENT_GUIDE.md`.
- Expand repo fact extraction beyond package scripts and GitHub Actions:
  - `Makefile`, `justfile`, `Taskfile.yml`, and README command blocks.
  - `.nvmrc`, `.node-version`, package `engines`, and setup action versions.
- Model scoped effective context before MCP:
  - Parent/child agent-instruction inheritance for workspaces and monorepos.
  - Cursor nested rule inheritance.
  - Path-scoped manifest output, for example `drctx manifest --path backend/src/api.ts`.
  - Invalid glob/path-specific rule checks for tools that support scoped instructions.
- Scan embedded workflow agent prompts:
  - Claude Code Action `custom_instructions`.
  - Claude Code Action `claude_args: --append-system-prompt`.
  - Claude Code Action `prompt` / `direct_prompt` values.
- Add rule-quality checks backed by public tool guidance:
  - Oversized agent instruction files, especially Cursor rules above the documented 500-line guidance.
  - Duplicate/conflicting instruction surfaces.
  - Low-specificity guidance such as generic “best practices” rules, with conservative severity.
  - Copied docs instead of references, repeated blocks, and context budget/noise estimates.
  - Missing canonical examples when instructions say to follow a style or pattern.
- Clean up CI command classification in manifests so shell plumbing such as `if`, `else`, `fi`, `echo`, and `exit` does not pollute canonical verification context.
- Add runtime and tool-version drift checks:
  - Node version drift between docs, `package.json` engines, `.nvmrc`, and GitHub Actions.
  - Package manager version drift between docs, `packageManager`, lockfiles, and setup actions.
- Add safety and workflow hygiene checks from the master plan:
  - Secret hygiene instruction gaps.
  - Destructive-action boundary gaps.
  - Generated/dist do-not-edit guidance.
  - Planning, TDD, review, and verification policy visibility when repo docs already define those workflows.
- Add adoption and launch assets before broader integrations:
  - Public/synthetic dogfood corpus and false-positive tracking.
  - Before/after examples for AGENTS.md, CI/doc mismatch, workspace scans, and GitHub Action SARIF setup.
  - Context health badge/score trend once findings are stable enough to summarize.
- Document supported instruction surfaces in README with source-backed notes for Copilot, Cursor, Claude Code, AGENTS.md, and CLAUDE.md.
- Config file and baseline mode.
- More context-file formats and stronger false-positive controls.

## Later

- Optional bundled JavaScript Action to avoid npm install-on-demand.
- MCP context gate after scoped manifests, config, and baseline mode are stable.
- Optional safe fixes with `--dry-run` before any write mode.
- Optional agent view/probe simulation for Claude, Codex, Copilot, Cursor, OpenCode, and other adapters.
- Optional AI remediation and prompt generation on top of deterministic findings.
- Optional context compaction, session stale-assumption detector, handoff/checkpoint generation, and Ruler/Repomix integrations.
