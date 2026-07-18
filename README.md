# Tech Europe / Cortea Hackathon

Evidence-first audit investigation application for the Tech Europe / Cortea hackathon.

The product will help auditors move from source files to traceable facts, entities, profiles, and evidence-backed findings. The repository now has the T00 architecture needed to build the frontend demo one ticket at a time.

## Current Status

T07 — Profile Layer is complete. T08 — Enrichment Layer is the next eligible ticket.

This version includes a production-ready Step 01 upload foundation: source files are validated server-side, stored locally unchanged, hashed with SHA-256, and described in a persisted dossier manifest. Existing demo mapping, entity, sub-entity, and profile layers remain in the codebase, but the upload flow itself does not call OpenAI, fingerprint files, classify documents, or extract entities.

Selecting files or a folder creates a persisted dossier, opens the Files workspace, and hands the accepted files to Step 2. See [Step 01 File Upload](docs/step-01-file-upload.md) for the upload API, storage structure, limits, and Step 2/Step 3 readiness.

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

Upload storage and limits:

```bash
DOSSIER_STORAGE_ROOT=./data/dossiers
MAX_FILES_PER_DOSSIER=50
MAX_FILE_SIZE_MB=50
MAX_TOTAL_UPLOAD_MB=500
```

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
- Production-ready multi-file upload foundation with stable dossier/file IDs, SHA-256 hashes, duplicate detection, safe local byte storage, manifest reload, and server-only source-file reads
- Ticket workflow under `codex/`

## Next Step

Implement T08 — Enrichment Layer. Follow the first eligible `TODO` ticket in `codex/STATUS.md`.
