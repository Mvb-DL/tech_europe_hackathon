# T04 — Animated File Map

**Status:** DONE  
**Human owners:** Mario and Leo  
**Depends on:** T02, T03

## Goal

Demonstrate files leaving the processing stack and joining groups on the map one by one.

## Scope

- stacked file cards in the left buffer
- active file state
- queued, reading, classified, placed, and failed states
- shared-element or coordinated movement from stack to map
- create group node when first category appears
- append file to existing group when category already exists
- activity events for each action
- inspector updates for the active file and selected group
- auto-layout after placement

## Acceptance criteria

- canvas starts empty
- only one file is the primary animated subject at a time
- all uploaded files are eventually placed or visibly failed
- existing groups remain spatially stable
- animation respects reduced-motion settings
- restarting the demo resets the entire layer

## Out of scope

- real content classification
- entity generation

## Completion Notes

- Added stacked buffer cards with queued, reading, classified, placed, and failure states, plus reduced-motion-aware coordinated movement into map nodes.
- Added stable grouped file-map layout, nested React Flow file nodes, source-aware inspector updates, activity events, and batch-based auto-fit.
- Added layout-stability coverage alongside deterministic replay and lineage tests.
- Verified with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
