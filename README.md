# Tech Europe / Cortea Hackathon

Evidence-first audit investigation application for the Tech Europe / Cortea hackathon.

The product will help auditors move from source files to traceable facts, entities, profiles, and evidence-backed findings. The repository now has the T00 architecture needed to build the frontend demo one ticket at a time.

## Current Status

T05 — Entity Layer is complete. T06 — Sub-Entity Layer is the next eligible ticket.

This version supports browser-local file selection, deterministic file mapping based only on filenames and extensions, and generic entity candidates derived from the resulting demo file groups. It does not implement file persistence, document parsing, real classification, real entity extraction, profiles, paths, evidence analysis, or fraud detection.

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
cp .env.example .env
```

No environment variables are required yet.

## Current Scope

- Minimal landing page
- `GET /api/health` health-check endpoint
- Source-provenance and pipeline contracts
- Client-side pipeline state-store skeleton
- Persistent React Flow workspace shell with layer navigation, buffer, inspector, and activity panels
- Deterministic demo file-mapping events, playback controls, and central event reduction
- Animated file buffer and grouped React Flow map with stable demo layout
- Deterministic entity-candidate events, stable entity map layout, candidate relationship labels, and trace-back to source file groups
- Isolated demo-adapter folders for later tickets
- Simple multi-file upload page that stores metadata and opens the Files workspace
- Ticket workflow under `codex/`

## Next Step

Implement T06 — Sub-Entity Layer. Follow the first eligible `TODO` ticket in `codex/STATUS.md`.
