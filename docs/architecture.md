# Architecture

The project is a single Next.js application using the App Router, TypeScript, Tailwind CSS, and ESLint. React Flow, Motion, Zustand, and Lucide are installed for the layered dossier-map demo.

## Current Foundation

- `src/app` contains application routes, global styles, layout, the landing page, and API routes.
- `src/app/api/health/route.ts` exposes `GET /api/health` for a basic runtime check.
- `src/lib/domain` contains source-provenance types that future features can reuse.
- `src/lib/pipeline` contains the public pipeline, graph, engine, layout, and state-store contracts.
- `src/demo` isolates future deterministic demo engines, fixtures, and rules from UI code.
- `src/features/file-upload` creates browser-local `UploadedFile` metadata without parsing or persisting file contents.
- `src/features/workspace` renders the persistent React Flow workspace shell from pipeline store state.
- `src/features/file-map` adapts typed file-layer snapshots into animated buffer cards and nested React Flow nodes.
- `src/features/entity-map` adapts typed entity-layer snapshots into stable, candidate-labelled React Flow nodes and edges.
- `src/app/dossiers/[dossierId]/workspace` keeps the shell mounted while the Files, Entities, Sub-entities, Profiles, and Enrichment URLs change.

## Replaceable Demo Boundary

UI code consumes `PipelineEvent` objects, `MapLayer` snapshots, and the central Zustand store. Demo engines will emit events through the interfaces in `src/lib/pipeline`; they must not manipulate UI state directly. The graph layout remains behind `GraphLayoutEngine`, allowing a later implementation to change without changing map components.

The upload page stores only file identifiers and metadata in the client-side store, then navigates to the Files workspace. It does not read document contents or send files to a server.

The workspace shell reads stage selection from the URL, synchronizes it to the store, and consumes the queue, activity, and map snapshots produced by the demo runtime. The file and entity stages use their own contract-only canvas adapters, while the inspector can trace a selected entity candidate back to its recorded source file groups.

## Demo Runtime

`src/demo/engines` contains deterministic filename-and-extension-only demo engines. The root composition layer injects them through `PipelineRuntimeProvider`; workspace controls consume `FileMappingEngine` and `EntityExtractionEngine` interfaces and apply emitted snapshots through the central reducer. The entity engine derives generic candidate types from existing demo file groups, retains source IDs and group IDs, and labels generated relationships as `candidate`; it does not make factual claims about document contents. Replacing either demo engine therefore does not require changes to the upload screen, workspace, inspector, map shell, or navigation.

Demo layout engines are injected through the same runtime boundary and write generic node-layout metadata to a `MapLayer` snapshot. File-map and entity-map UI code read that metadata through `GraphLayoutEngine` helpers, so a future layout implementation can replace it without changing React Flow components.

Future product work should be organized by feature under `src/features`. Shared domain types remain in `src/lib/domain`; server-only helpers can be added under `src/lib/server` when needed; generic utilities can be added under `src/lib/utils` when they remove real duplication.

No separate backend, database, storage provider, authentication, AI API, or external integration exists in the current foundation.
