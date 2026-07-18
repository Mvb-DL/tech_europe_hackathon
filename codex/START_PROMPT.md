# Codex Start Prompt

You are implementing the frontend demo for the Tech Europe / Cortea hackathon repository.

## First actions

1. Inspect the entire repository.
2. Read the repository `README.md`, `AGENTS.md`, and existing docs.
3. Copy or add this `codex/` ticket folder to the repository if it is not already present.
4. Read:
   - `codex/README.md`
   - `codex/STATUS.md`
   - `codex/concept/UI_CONCEPT.md`
   - `codex/concept/ARCHITECTURE_CONTRACT.md`
5. Select only the first eligible `TODO` ticket.
6. Implement that ticket and stop.

## Product direction

Build a transparent layered dossier map with this sequence:

1. File Upload
2. File Map
3. Entity Layer
4. Sub-Entity Layer
5. Profile Layer
6. Enrichment Layer

The upload page is deliberately simple. The remaining stages share one persistent workspace with a left processing buffer, central graph canvas, right inspector, top layer navigation, and compact activity stream.

The file-map demo must visibly process uploaded files one at a time. A file leaves the left stack, is marked as being read, and then joins or creates a category group on the map. Later layers emerge from the previous layer and remain traceable back to uploaded files.

## Technical direction

The repository uses Next.js, TypeScript, and Tailwind.

Use React Flow for the map canvas and nested graph nodes. Use Motion for coordinated queue and layer transitions. Keep graph layout behind an adapter. Use a small central store for graph and pipeline state.

Do not copy or depend on paid template code. Build from public APIs and the repository's own components.

## Architecture requirement

The frontend demo logic must be replaceable.

UI components consume typed `PipelineEvent` objects and `MapLayer` snapshots. Demo engines emit events now. Real parsers, APIs, jobs, or AI agents must be able to replace those engines later without rewriting the upload page, workspace, map nodes, inspector, or navigation.

Keep demo code under `src/demo/`. Keep contracts under `src/lib/pipeline/`. UI code must never import demo rules directly.

## Non-negotiable rules

- implement one ticket at a time
- do not continue automatically to the next ticket
- do not implement fraud detection
- do not encode ground-truth fraud answers
- do not present simulated content as proven evidence
- do not parse documents inside React components
- do not call external AI or enrichment services
- do not introduce a database or separate backend
- do not overdesign individual nodes
- preserve source IDs and lineage on generated objects
- support reduced-motion preferences

## Quality gates

Before completing a ticket, run the repository's relevant commands, including:

```bash
npm run lint
npm run typecheck
npm run build
```

If `typecheck` does not exist, add a suitable script.

Update:

- the ticket completion notes
- `codex/STATUS.md`
- concise relevant documentation

Then report:

1. ticket completed
2. files changed
3. behavior added
4. commands run and results
5. remaining limitations
6. next eligible ticket

Do not commit or push unless explicitly requested.
