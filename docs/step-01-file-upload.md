# Step 01 - File Upload

The upload layer stores source files for later fingerprinting, mapping, and entity extraction. It does not parse business contents, classify documents, extract entities, or call OpenAI.

## Flow

1. The existing upload UI posts selected files to `POST /api/dossiers`.
2. The server validates file count, extensions, empty files, individual size, total size, and exact duplicates by SHA-256.
3. Accepted files receive generated dossier and file IDs.
4. Original bytes are written unchanged to local storage.
5. A `manifest.json` stores dossier metadata and stable source-file identity.
6. The workspace can reload metadata with `GET /api/dossiers/:dossierId`.
7. The frontend pipeline can then hand accepted files to Step 2 without changing storage or upload code.

## Storage

Default root:

```text
data/dossiers/<dossier-id>/
├── manifest.json
└── files/
    └── <file-id>-<safe-filename>
```

The storage root is configured with `DOSSIER_STORAGE_ROOT`. Absolute paths are never returned by public APIs.

## API

`POST /api/dossiers`

Accepts multipart form data:

- `name` optional dossier name
- `files` one or more source files

Returns:

- `dossier`
- `acceptedFileIds`
- `rejectedFiles[]` with `originalName` and `reason`

`GET /api/dossiers/:dossierId`

Returns persisted dossier metadata or `404` when unknown.

## Supported Types And Limits

Supported extensions:

- `.pdf`
- `.csv`
- `.txt`
- `.xlsx`
- `.xml`
- `.docx`

Defaults:

- `MAX_FILES_PER_DOSSIER=50`
- `MAX_FILE_SIZE_MB=50`
- `MAX_TOTAL_UPLOAD_MB=500`

## Security Decisions

- File handling is server-side.
- Uploaded files are never executed.
- Original filenames are sanitized.
- Storage filenames include generated file IDs.
- Path traversal is rejected through safe IDs and sanitized filenames.
- Empty, unsupported, oversized, over-limit, and duplicate files are rejected individually.
- `.env.local` and `data/` remain ignored by Git.
- `AGENT_API_KEY` is not used by upload.

## Step 2 Readiness

Step 2 can call the server-only `getSourceFile({ dossierId, fileId })` method to receive:

- persisted `SourceFile` metadata
- original bytes as `Uint8Array`

This gives fingerprinting and agent-assisted mapping stable file identity, filename, extension, MIME type, size, SHA-256, and bytes.

## Step 3 Readiness

The upload domain defines `SourceReference` with stable dossier/file identity and optional location fields such as sheet, page, row, column, and passage. Entity extraction can attach facts back to the original source file and hash.
