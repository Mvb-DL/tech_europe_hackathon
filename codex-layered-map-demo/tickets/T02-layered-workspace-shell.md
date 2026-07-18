# T02 — Layered Workspace Shell

**Status:** TODO  
**Human owner:** Mario  
**Depends on:** T00

## Goal

Build the persistent shell used by Files, Entities, Sub-entities, Profiles, and Enrichment.

## Scope

- top stage rail
- left context/buffer panel
- central React Flow canvas
- right inspector panel
- bottom activity stream
- nested routes sharing one layout
- active layer represented in URL
- selected node state
- simple previous-layer underlay effect

## Acceptance criteria

- navigation between layers preserves the shell
- no layer uses unrelated dashboard widgets
- panels can collapse where useful
- the centre canvas is the primary visual area
- empty states are clear

## Out of scope

- real nodes
- file processing animation
- extraction logic
