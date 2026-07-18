# T05 — Entity Layer

**Status:** DONE  
**Human owners:** Leo and Mario  
**Depends on:** T04

## Goal

Show how entity candidates emerge from mapped file groups.

## Scope

- create entity layer from demo events
- generic entity types such as Vendor, User, Invoice, Payment, Asset, Account, and Approval
- animate entity nodes emerging from their source groups
- lineage links back to file groups
- label all generated relationships as `demo` or `candidate`
- inspector shows source groups and creation event

## Acceptance criteria

- user can move between file and entity layers
- entity positions are readable and stable
- every entity has at least one source ID
- `Trace to files` navigates down correctly

## Out of scope

- parsing actual rows
- identity resolution
- fraud signals

## Completion Notes

- Added an injected deterministic entity-extraction engine that derives only generic, explicitly demo-labelled candidates from file-group snapshots and retains file and group lineage.
- Added a stable React Flow entity map, candidate-labelled relationship edges, reduced-motion-aware emergence, event playback controls, and entity inspector details.
- Added `Trace to files`, which selects a recorded source group and navigates to the Files layer.
- Added deterministic entity event, lineage, candidate-edge, and layout coverage.
- Verified with `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
