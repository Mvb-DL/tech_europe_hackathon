# Tech Europe / Cortea Hackathon

Evidence-first audit investigation application for the Tech Europe / Cortea hackathon.

The product will help auditors move from source files to traceable facts, entities, profiles, and evidence-backed findings. The repository now has the T00 architecture needed to build the frontend demo one ticket at a time.

## Current Status

T07 — Profile Layer is complete. T08 — Enrichment Layer is the next eligible ticket.

This version persists uploaded source files locally, fingerprints supported formats server-side, and maps files using observed signals with an optional validated OpenAI fallback. It includes deterministic demo entity, sub-entity, and profile layers. It does not implement enrichment, paths, evidence analysis, or fraud detection.

Selecting files or a folder starts the real File Map stage automatically. See [Step 2 File Mapping](docs/step-02-file-mapping.md) for API, storage, and fallback details.

## Technical Stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- ESLint
- React Flow
- Motion
- Zustand
- Lucide icons
- `src/` directory
- `@/*` import alias
- npm

## Local Installation

```bash
npm install
```

## Development Commands

```bash
npm run dev
npm run lint
npm test
npm run typecheck
npm run build
```

## Environment

```bash
cp .env.example .env.local
```

The File Map works without an API key. Set `AGENT_API_KEY` only to enable the optional server-side fallback classifier.

## Current Scope

- Minimal landing page
- `GET /api/health` health-check endpoint
- Source-provenance and pipeline contracts
- Client-side pipeline state-store skeleton
- Persistent React Flow workspace shell with layer navigation, buffer, inspector, and activity panels
- Deterministic demo file-mapping events, playback controls, and central event reduction
- Animated file buffer and grouped React Flow map with stable demo layout
- Deterministic entity-candidate events, stable entity map layout, candidate relationship labels, and trace-back to source file groups
- Nested, collapsible sub-entity groups with stable parent-child layout and trace-back to parent entities
- Profile consolidation demo with provenance-coded metrics, source coverage, data gaps, and trace-down links to contributing sub-entities
- Isolated demo-adapter folders for later tickets
- Simple multi-file upload page that stores metadata and opens the Files workspace
- Ticket workflow under `codex/`

## Next Step

Implement T08 — Enrichment Layer. Follow the first eligible `TODO` ticket in `codex/STATUS.md`.
