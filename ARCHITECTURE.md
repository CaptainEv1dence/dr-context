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
5. **Checks** are pure functions over `CheckContext`, including workflow prompt checks over extracted workflow prompt facts.
6. **Reporters** render `Report` objects only.

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
