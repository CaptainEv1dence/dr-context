# Dr. Context launch checklist

## Public launch promise

Dr. Context finds evidence-backed ways your repo lies to AI coding agents before agents read stale or contradictory instructions.

## Launch copy

Title:

```text
Show HN: Dr. Context, find ways your repo lies to AI coding agents
```

Short body:

```text
AI coding agents often fail because repo context is stale: AGENTS.md says one command, CI runs another, architecture docs exist but are invisible, or agent instructions are bloated and contradictory.

Dr. Context is a local, read-only CLI that checks agent instructions, package metadata, CI workflows, and repo docs for source-backed context rot.

It does not call LLMs, does not send code to a service, and does not write files during scans.
```

## Channels

- Hacker News Show HN
- r/ClaudeCode
- r/cursor
- Codex/OpenAI developer communities
- AI coding/devtools Discords
- GitHub topics: `agents-md`, `claude-code`, `cursor`, `codex`, `ai-agents`, `devtools`

## Pre-launch checks

- README explains the product value in one screen.
- Demo uses synthetic/public-safe examples only.
- GitHub Action docs make registry/network behavior explicit.
- Package metadata links point to the real repository.
- No docs contain private repo names, local private paths, credentials, tokens, or raw private findings.
