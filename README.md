# Tech Europe / Cortea Hackathon

Evidence-first audit investigation application for the Tech Europe / Cortea hackathon.

The product will help auditors move from source files to traceable facts, entities, profiles, and evidence-backed findings. The current repository is only a clean Next.js foundation so Step 1 can be implemented next.

## Current Status

Foundation phase. File Upload is the next implementation step.

This version does not implement upload, parsing, mapping, entity extraction, profiles, paths, evidence analysis, or fraud detection.

## Technical Stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- ESLint
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
- Source-provenance domain types for future development
- Concise project documentation
- Folder reserved for the next File Upload implementation

## Next Step

Implement Step 1: File Upload without changing the project structure.
