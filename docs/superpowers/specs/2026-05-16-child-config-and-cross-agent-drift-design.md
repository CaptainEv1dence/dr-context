# Child Config and Cross-Agent Drift Design

This is a design artifact only. It does not implement production behavior in this slice.

## Goal

Resolve two remaining deterministic gaps: how parent `.drctx.json` config should apply to package roots, and how direct conflicts between agent instruction files should be reported.

## Child config inheritance

Current workspace baselines are scoped to owning candidate paths, but child config inheritance is deferred. A future design should decide whether child scans inherit parent `.drctx.json` limits and excludes by default, by flag, or never.

Recommended default: inherit resource limits and excludes only when scanning through workspace mode, and show inherited config sources in JSON. Direct package-root scans should use nearest config only unless `--config` is passed.

## Cross-agent drift

Current drift checks compare agent-visible commands to repo facts and CI. A future direct cross-agent drift check should compare instruction surfaces to each other only for deterministic facts:

- package-manager commands;
- verification commands;
- exact first-read paths;
- safety boundary presence when one agent surface has it and another omits it.

## False-positive controls

- Do not compare broad prose semantically.
- Do not require every tool-specific file to repeat all root instructions.
- Prefer info severity unless a deterministic contradiction exists.

## Recommendation

Plan child config inheritance before direct cross-agent drift. Config inheritance affects workspace reliability; cross-agent drift needs more dogfood calibration.
