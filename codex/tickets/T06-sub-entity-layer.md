# T06 — Sub-Entity Layer

**Status:** DONE
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

## Completion Notes

- Added an injected deterministic sub-entity engine and layout adapter that expand entity candidates into generic, explicitly demo-labelled component fixtures.
- Added nested React Flow parent groups, attached child nodes, store-backed collapse state, parent dragging, and reduced-motion-aware transitions.
- Added inspector details for parent entity, source groups, status, and a `Trace to entity` action; entity lineage continues to source file groups through T05.
- Added deterministic sub-entity event, lineage, nested-layout, and source-ID coverage.
- Verified with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
