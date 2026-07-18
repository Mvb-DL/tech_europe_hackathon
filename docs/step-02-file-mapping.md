# Step 2: File Mapping

## Purpose

Step 2 stores uploaded source files server-side, creates bounded fingerprints, classifies each file into the closed mapping taxonomy, discovers observed file connections, persists the resulting map, and replays real events in the existing File Map UI.

## Architecture

- Browser upload: `POST /api/dossiers/:dossierId/files`
- Mapping: `POST /api/dossiers/:dossierId/mapping`
- Reloading persisted results: `GET /api/dossiers/:dossierId/mapping`
- Local storage: `data/dossiers/<dossierId>/` is ignored by Git. Original files are stored separately from `mapping/file-map.json` and `mapping/mapping-events.json`.
- `ApiFileMappingEngine` adapts persisted API events to the existing `FileMappingEngine` contract. Set `NEXT_PUBLIC_FILE_MAPPING_PROVIDER=demo` only to use the development demo engine.

## Taxonomy and Classification

`domain/taxonomy.ts` owns all primary domains and document roles. Rules use observed manifest references, headers, sheets, titles, content markers, and filename evidence. Filename-only matches are capped below high confidence. Files without sufficient evidence remain `unknown`.

Confidence at or above `0.90` remains deterministic. Lower-confidence fingerprints may use the optional server-only OpenAI fallback when `FILE_MAPPING_AGENT_ENABLED=true` and `AGENT_API_KEY` is present. The adapter uses the Responses API with `store: false`, sends only compact fingerprints, and locally validates every response. Failure or absence of the agent leaves rules-only mapping usable.

## Fingerprints and Connections

CSV/TXT, XLSX, XML, PDF, and DOCX parsers extract capped samples and metadata only. XML references and specific shared identifiers create connections; generic fields such as date, amount, name, and status do not create confirmed links.

## Environment

```bash
AGENT_API_KEY=
AGENT_MODEL=gpt-5
FILE_MAPPING_AGENT_ENABLED=true
```

`AGENT_API_KEY` is server-side only and must never be committed. Add rules in `classification/mapping-rules.ts`; add a parser by implementing `FileFingerprinter` in `fingerprint/create-file-fingerprint.ts`.

## Limitations

The pipeline uses bounded metadata extraction, no OCR, no entity extraction, and no fraud or finding logic. Folder uploads rely on the browser directory-picker capability.
