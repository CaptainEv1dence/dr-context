# Recognized instruction surfaces

Dr. Context reports recognized local instruction surfaces. This is not a live claim about what any provider, editor, CLI, or runtime agent loaded during a session.

Use the manifest to inspect recognized context:

```bash
drctx manifest --json --root .
drctx manifest --path src/example.ts --root .
```

## Tool families

The source of truth for recognized instruction-file path patterns is `src/extractors/instructionSurfaces.ts`.

| Tool family | Scope Dr. Context reports | Exact local path patterns recognized |
| --- | --- | --- |
| Vendor-neutral / Codex-style | Repository root, override, and nested instruction files | `AGENTS.md`, `AGENTS.override.md`, `**/AGENTS.md` |
| Claude-style | Repository root, local, and skill instruction files | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/skills/**/SKILL.md` |
| GitHub Copilot | Repository, path-scoped, and custom-agent instruction files | `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`, `.github/agents/*.agent.md` |
| Cursor | Legacy repository rule file and nested rule files | `.cursorrules`, `.cursor/rules/**/*.{md,mdc}` |
| Gemini-style | Repository root instruction file | `GEMINI.md` |
| JetBrains Junie | Repository guidelines file | `.junie/guidelines.md` |
| Jules-style | Repository root instruction file | `JULES.md` |
| Windsurf | Repository root rule file | `.windsurfrules` |
| Continue | Nested rule files | `.continue/rules/**/*.{md,mdc}` |
| Aider | Repository root config files | `.aider.conf.yml`, `.aider.conf.yaml` |
| Cody | Nested Sourcegraph Cody instruction files | `.sourcegraph/cody/**/*.md` |
| Explicit guides | Repository root guide file | `AGENT_GUIDE.md` |

`CLAUDE.local.md` and local override files can contain personal or machine-local instructions. Dr. Context recognizes them when present in the working tree, but teams should avoid committing secrets or personal credentials in any instruction surface.

Skill files such as `.claude/skills/**/SKILL.md` are task-level context inventory. Dr. Context recognizes them as local context surfaces, but does not claim every skill is loaded for every source path.

`.mcp.json` is configuration context, not an agent instruction surface. It is reported in manifest/config context only when manifest support is present.

Dr. Context also reports workflow-embedded prompts in `workflowPrompts` when it can extract them from supported local workflow files. These are reported separately because they are prompts embedded in automation, not effective instruction files loaded for a target source path.

## Reading coverage safely

- `agentInstructionFiles` are recognized repo-local instruction files.
- `workflowPrompts` are embedded workflow prompts and are not effective instruction files.
- `effectiveInstructionFiles` is path-scoped when `--path` is used, so nested and path-scoped files are only shown as effective when they apply to the requested path.
- Parent workspace instructions are not inherited unless `--inherit-parent-instructions` is explicitly used in workspace scans.

## Repo roots and workspaces

For a first run, scan the repository root you expect agents to use:

```bash
drctx check --root .
drctx manifest --root .
```

If you scan a parent folder that contains several repositories, results may describe only recognized workspace candidates or may show limited coverage for the parent itself. Use workspace mode intentionally when auditing multiple repos, and inspect `drctx manifest` output before treating a clean result as meaningful.

When auditing multiple repositories under a shared parent, use workspace scan or discovery for the parent folder, then run manifest on one specific repository root:

```bash
drctx check --workspace --root ../workspace
drctx discover --root ../workspace
drctx manifest --root ../workspace/<specific-repo>
```

Use `--inherit-parent-instructions` only when the shared parent instructions are intentionally part of each child repository's context contract.

## Known limitation

Dr. Context does not inspect a live Claude, Copilot, Cursor, Codex, or OpenCode session in 0.3.9. Agent probes are a later optional layer.
