# Context Tool Integrations Design

This is a design artifact only. It does not implement production behavior in this slice.

## Goal

Define how Dr. Context should complement tools that generate, synchronize, or package agent context.

## Ruler

Ruler syncs rules across agent formats. Dr. Context should validate generated or synchronized outputs after Ruler writes them. Dr. Context should not become a Ruler replacement or template engine.

## Repomix

Repomix packs repository content for AI use. Dr. Context should run before packing to catch stale commands, hidden policies, and bloated instruction surfaces. Dr. Context should not become a repo packer.

## First integration shape

- Documentation recipes.
- Optional CI examples.
- No runtime dependency on Ruler or Repomix.

## Recommendation

Start with docs recipes after `drctx init`. Add code integration only after users ask for a concrete workflow.
