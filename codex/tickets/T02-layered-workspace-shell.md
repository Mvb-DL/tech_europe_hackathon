# T02 — Layered Workspace Shell

**Status:** DONE  
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

## Completion Notes

- Added a persistent React Flow workspace shell with URL-driven layer navigation, collapsible processing buffer and inspector panels, an empty canvas, activity stream, and previous-layer underlay.
- Connected the shell to central uploaded-file, event, active-stage, and selected-node state without adding graph data or pipeline logic.
- Verified with `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, and local workspace URL smoke checks.
