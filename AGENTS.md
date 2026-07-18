# AGENTS

## Current Phase

T06 — Sub-Entity Layer is complete. T07 — Profile Layer is the next eligible ticket.

## Ticket Workflow

- Treat `codex/` as the canonical ticket system.
- Read the ticket packet and select only the first eligible `TODO` ticket.
- Complete one ticket, run lint, typecheck, and build, then update its ticket notes and `codex/STATUS.md`.
- Do not start a later ticket automatically.

## Project Principles

- Every fact must remain traceable to its original source.
- Keep the application small, working, and easy to demonstrate.
- Prefer typed interfaces and explicit source references.
- Preserve useful existing work and exercise data.

## Technical Constraints

- Keep this as one Next.js application.
- Use the App Router, TypeScript strict mode, Tailwind CSS, ESLint, `src/`, and the `@/*` import alias.
- Use npm unless the repository is intentionally migrated later.
- Do not add a separate backend, database, authentication, storage provider, AI API, graph database, or component library until the product needs it.
- Keep public pipeline contracts in `src/lib/pipeline` and simulated logic in `src/demo`.
- UI code may consume pipeline contracts and store state, but must not import demo rules directly.
- Inject demo engines through a runtime provider so future parsers, APIs, jobs, or agents can replace them without changing UI components.

## Scope Protection

- Do not hardcode sample answers or seeded fraud conclusions.
- Preserve source IDs and lineage on generated objects.
- Do not parse documents inside React components or call external AI or enrichment services.
- Do not present simulated content as proven evidence.
- Keep upload data client-side until a future ticket explicitly adds a persistence boundary.
- Keep changes small, working, documented, and covered by lint, typecheck, and build checks.
