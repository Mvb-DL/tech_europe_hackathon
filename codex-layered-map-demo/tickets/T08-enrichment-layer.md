# T08 — Enrichment Layer

**Status:** TODO  
**Human owners:** Leo and Mario  
**Depends on:** T07

## Goal

Demonstrate how internal and external enrichment can extend profiles without changing the UI architecture.

## Scope

- simulated internal enrichment events
- simulated external enrichment events
- visually distinguish internal, external, pending, unavailable
- update profile completeness
- retain source-provider metadata
- adapter interface for future enrichment providers

## Acceptance criteria

- enrichment can be replayed independently
- source type is always visible
- unavailable enrichment does not appear as a failure of the whole profile
- no real external API is required

## Out of scope

- live company registers
- sanction APIs
- web search
