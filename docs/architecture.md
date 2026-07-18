# Architecture

The project is a single Next.js application using the App Router, TypeScript, Tailwind CSS, and ESLint.

## Current Foundation

- `src/app` contains application routes, global styles, layout, the landing page, and API routes.
- `src/app/api/health/route.ts` exposes `GET /api/health` for a basic runtime check.
- `src/lib/domain` contains source-provenance types that future features can reuse.
- `src/features/file-upload` is reserved for the next implementation step.

## Planned Structure

Future product work should be organized by feature under `src/features`. Shared domain types should remain in `src/lib/domain`; server-only helpers can be added under `src/lib/server` when needed; generic utilities can be added under `src/lib/utils` when they remove real duplication.

No separate backend, database, storage provider, authentication, AI API, or external integration exists in the current foundation.
