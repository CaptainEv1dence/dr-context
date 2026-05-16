# MCP and Agent Probes Design

This is a design artifact only. It does not implement production behavior in this slice.

## Goal

Expose Dr. Context's deterministic context contract to agents without weakening scanner semantics.

## MCP context gate

Future MCP tools may expose:

- `drctx_check_repo`
- `drctx_check_workspace`
- `drctx_manifest`
- `drctx_explain_finding`

## Boundaries

- Local-only by default.
- No network calls beyond the user-selected MCP transport.
- Findings remain deterministic and source-backed.
- Large structured reports should not be dumped into model text by default.
- `.mcp.json` is configuration context, not proof that a server is safe or reachable.

## Agent probes

Agent probes may compare expected context with what a live provider/editor appears to load. They are experimental, provider-specific, opt-in, and not used for default findings.

## Recommendation

Build MCP before probes. MCP can reuse deterministic outputs; probes create provider-specific auth, session, and support complexity.
