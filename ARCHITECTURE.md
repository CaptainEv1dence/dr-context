# Architecture

Dr. Context is built as a deterministic scanner pipeline.

## Core pipeline

```text
CLI args
  |
  v
RunConfig
  |
  v
WorkspaceReader + Discovery
  |
  v
RawFile[]
  |
  +--> Extractors -------------------+
  |       package.json                |
  |       lockfiles                   |
  |       markdown instructions       |
  |       GitHub Actions YAML         |
  |       workflow-embedded prompts   |
  |       Makefile / justfile         |
  |       architecture docs           |
  |       normalized runtime facts     |
  |       package-manager intent       |
  |                                   v
  +----------------------------> RepoFacts
                                      |
                                      v
                                  CheckContext
                                      |
                                      v
                               CheckRegistry
                                      |
                                      v
                                  Finding[]
                                      |
                                      v
                         TextReporter / JsonReporter
                                      |
                                      v
                                  ExitCode
```

## Boundaries

1. **CLI** parses args, calls `runScan`, renders reports, and exits.
2. **IO** owns filesystem access.
3. **Discovery** finds relevant files but does not parse semantics.
4. **Extractors** turn raw files into source-backed facts.
5. **Extractors** also normalize deterministic comparison facts, such as Node majors and package-manager command intent, while preserving raw source evidence.
6. **Checks** are pure functions over `CheckContext`, including workflow prompt checks over extracted workflow prompt facts.
7. **Reporters** render `Report` objects only.

## Fact normalization

Checks should compare normalized facts, not re-parse files. For 0.3.5, runtime extraction records Node version evidence with raw text plus deterministic comparison fields:

- `normalizedMajor` for static exact or wildcard major forms such as `20`, `v20`, `20.11.1`, and `20.x`.
- `minimumMajor` for minimum forms such as `>=20`.
- `unsupportedReason` for dynamic or unsupported values such as `lts/*`, `node`, `latest`, matrix expressions, and environment variables.

Package-manager command intent is normalized before package-manager checks compare command evidence. `pnpm`, `corepack pnpm`, and `corepack pnpm@<version>` all compare as `pnpm`; `corepack enable` alone is not package-manager command intent.

The 0.3.5 drift checks follow the same purity boundary as earlier checks:

- `node-runtime-drift` compares deterministic Node version facts only.
- `package-manager-drift` compares canonical JavaScript package-manager intent against lockfiles, setup actions, and deterministic command mentions.
- `verification-command-conflict` compares agent-visible verification commands against CI and package scripts for the same script intent.

Ambiguous evidence should produce no finding rather than a guessed warning.

## Extension points

- New file format: add an extractor.
- New behavior: add a pure check and register it.
- New output: add a reporter.
- Future runtime surfaces, such as GitHub Action or MCP, should call `runScan`.

## v0.1 constraints

- No LLM calls.
- No network calls.
- No file writes by default.
- No public plugin API.
- JSON reports include `schemaVersion` from day one.
