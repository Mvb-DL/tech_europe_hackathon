# Architecture

The project is a single Next.js application using the App Router, TypeScript, Tailwind CSS, and ESLint. React Flow, Motion, Zustand, and Lucide are installed for the layered dossier-map demo.

## Current Foundation

- `src/app` contains application routes, global styles, layout, the landing page, and API routes.
- `src/app/api/health/route.ts` exposes `GET /api/health` for a basic runtime check.
- `src/lib/domain` contains source-provenance types that future features can reuse.
- `src/lib/pipeline` contains the public pipeline, graph, engine, layout, and state-store contracts.
- `src/demo` isolates deterministic demo engines, fixtures, and rules from UI code.
- `src/features/file-mapping` contains server-side fingerprinting, rules, optional agent fallback, connections, persistence, and API-provider adapters.
- `src/features/file-upload` creates browser-local `UploadedFile` metadata without parsing or persisting file contents.
- `src/features/workspace` renders the persistent React Flow workspace shell from pipeline store state.
- `src/features/file-map` adapts typed file-layer snapshots into animated buffer cards and nested React Flow nodes.
- `src/features/entity-map` adapts typed entity-layer snapshots into stable, candidate-labelled React Flow nodes and edges.
- `src/features/sub-entity-map` adapts typed sub-entity snapshots into nested, collapsible React Flow groups while retaining parent-child node IDs.
- `src/features/profile-map` adapts typed profile snapshots into compact profile cards with provenance-coded metrics, source coverage, data gaps, and trace-down lineage.
- `src/app/dossiers/[dossierId]/workspace` keeps the shell mounted while the Files, Entities, Sub-entities, Profiles, and Enrichment URLs change.

## Replaceable Demo Boundary

UI code consumes `PipelineEvent` objects, `MapLayer` snapshots, and the central Zustand store. Demo engines will emit events through the interfaces in `src/lib/pipeline`; they must not manipulate UI state directly. The graph layout remains behind `GraphLayoutEngine`, allowing a later implementation to change without changing map components.

The upload page transfers selected files to the Next.js Node runtime, then keeps returned file metadata in the client-side store. Parsing, persistence, and OpenAI access remain server-side.

File and folder selection retains browser-local metadata, including a relative folder path when supplied by the browser, then automatically starts file mapping. Later pipeline adapters remain replaceable implementation capabilities and run only after explicit user navigation and interaction.

The workspace shell reads stage selection from the URL, synchronizes it to the store, and consumes the queue, activity, and map snapshots produced by the demo runtime. The file, entity, sub-entity, and profile stages use their own contract-only canvas adapters. The inspector traces an entity candidate to recorded source file groups, a sub-entity to its parent entity, and a profile down to contributing sub-entities.

## Demo Runtime

The root composition layer injects an API-backed `FileMappingEngine` through `PipelineRuntimeProvider`; the existing demo engine remains selectable for development. Workspace controls consume `FileMappingEngine`, `EntityExtractionEngine`, `SubEntityEngine`, and `ProfileEngine` interfaces and apply emitted snapshots through the central reducer. The real Step-2 service persists map results and replays observed mapping events; UI components do not import parser, storage, or agent implementations.

Demo layout engines are injected through the same runtime boundary and write generic node-layout metadata to a `MapLayer` snapshot. File-map, entity-map, and sub-entity-map UI code read that metadata through `GraphLayoutEngine` helpers, so a future layout implementation can replace it without changing React Flow components. The store holds collapsed group IDs as UI state, leaving emitted graph snapshots unchanged.

Future product work should be organized by feature under `src/features`. Shared domain types remain in `src/lib/domain`; server-only helpers can be added under `src/lib/server` when needed; generic utilities can be added under `src/lib/utils` when they remove real duplication.

The application remains a single Next.js deployment. Step 2 adds Node-runtime API routes and local filesystem storage under ignored `data/`; no separate database, authentication service, graph database, or external enrichment integration is used. The optional OpenAI adapter reads `AGENT_API_KEY` server-side and sends only compact fingerprints with `store: false`.
