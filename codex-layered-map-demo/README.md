# Codex Ticket System — Layered Dossier Map Demo

This folder defines the implementation sequence for the interactive frontend demo.

## How Codex must work

1. Read `START_PROMPT.md`.
2. Read `STATUS.md`.
3. Select the first ticket with status `TODO` whose dependencies are complete.
4. Implement only that ticket.
5. Run lint, typecheck, and build.
6. Update the ticket's completion notes and change its status in `STATUS.md`.
7. Stop and report. Do not automatically continue to the next ticket.

## Product sequence

1. File Upload
2. File Map
3. Entity Layer
4. Sub-Entity Layer
5. Profile Layer
6. Enrichment Layer

The upload page is separate. Steps 2–6 share one persistent layered workspace.

## Core product rule

The demo logic must be replaceable. UI components consume typed pipeline events and graph snapshots. Mock engines produce those events now; real extraction and agent engines can replace them later without rewriting the workspace.
