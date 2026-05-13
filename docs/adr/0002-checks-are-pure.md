# ADR 0002: Checks Are Pure

## Status

Accepted.

## Context

Checks are the product's trust boundary. If checks read files directly or mutate state, they become hard to test and hard to reason about.

## Decision

Checks consume `CheckContext` and return `Finding[]`. Checks must not perform file IO, logging, network calls, or process exits.

## Consequences

- Extractors own parsing and evidence capture.
- Checks stay small and testable.
- New runtime surfaces can reuse the same scanner core.
