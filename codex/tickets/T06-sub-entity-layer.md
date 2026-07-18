# T06 — Sub-Entity Layer

**Status:** TODO  
**Human owners:** Leo and Mario  
**Depends on:** T05

## Goal

Expand entities into grouped, collapsible sub-entities.

## Scope

- nested/group nodes
- parent-child layout
- expand and collapse behavior
- generic sub-entity fixtures
- lineage back to parent entity and files
- inspector shows parent, source, and status

## Acceptance criteria

- expanding one entity does not destroy the full map context
- parent movement keeps children attached
- collapsed state remains navigable
- every sub-entity retains source IDs

## Out of scope

- actual transaction matching
- proof logic
