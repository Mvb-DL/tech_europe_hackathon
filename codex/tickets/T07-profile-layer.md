# T07 — Profile Layer

**Status:** DONE  
**Human owners:** Leo and Mario  
**Depends on:** T06

## Goal

Consolidate sub-entities into concise profile cards.

## Scope

- profile nodes for Vendor, User, Asset, and Customer examples
- compact metrics and completeness indicators
- observed, derived, inferred visual states
- source coverage indicator
- data gap indicator
- lineage to contributing sub-entities
- details in inspector, not overloaded nodes

## Acceptance criteria

- profiles remain readable at normal zoom
- derived values visibly differ from observed values
- no unsourced field is shown as factual
- trace-down navigation works

## Completion notes

- Added an injected deterministic `ProfileEngine` and profile layout engine for the `profiles` pipeline stage.
- Added profile playback controls with pause, resume, restart, and speed settings.
- Added a dedicated React Flow profile canvas with compact profile cards, source coverage bars, provenance-coded metric tags, data gap indicators, and dashed candidate connections.
- Updated the workspace inspector to show profile metrics with observed/derived/inferred provenance, source labels, gaps, and trace-down links to contributing sub-entities.

## Out of scope

- fraud scores
- risk labels
- external calls
