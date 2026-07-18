# T07 — Profile Layer

**Status:** TODO  
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

## Out of scope

- fraud scores
- risk labels
- external calls
