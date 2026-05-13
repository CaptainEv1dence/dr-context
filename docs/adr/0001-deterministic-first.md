# ADR 0001: Deterministic First

## Status

Accepted.

## Context

Dr. Context needs user trust. The first version must identify concrete repo facts, not make vague AI judgments.

## Decision

v0.1 will not call LLMs or network services. It will use deterministic file discovery, extraction, checks, and reporting.

## Consequences

- Lower trust barrier.
- Easier tests.
- Some fuzzy checks are deferred.
- Future LLM-assisted compaction must be opt-in and diff-first.
