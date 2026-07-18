# T00 — Foundation and Contracts

**Status:** TODO  
**Human owners:** Leo and Mario

## Goal

Prepare the frontend architecture for a replaceable, event-driven layered map demo.

## Scope

- inspect the current Next.js repository
- add only the required dependencies
- create pipeline, graph, and source contracts
- create central store skeleton
- create demo adapter folders
- create layout adapter interface
- create route skeletons
- keep all routes minimal and compiling

## Suggested dependencies

- `@xyflow/react`
- `motion`
- `zustand`
- `elkjs` only if used through the layout adapter now
- minimal shadcn components only when needed

## Acceptance criteria

- lint passes
- typecheck passes
- production build passes
- all six routes exist
- shared workspace layout persists between map routes
- demo engine code is isolated from UI code
- no upload UI or graph behavior yet

## Out of scope

- real parsing
- animations
- final styling
- agents
- fraud logic
