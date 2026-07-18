# T01 — Simple File Upload

**Status:** DONE  
**Human owner:** Mario  
**Depends on:** T00

## Goal

Create the deliberately simple first page where users select the dossier files.

## Scope

- central multi-file upload area
- support PDF, CSV, TXT, XLSX, XML, and DOCX
- show selected filenames and count
- allow removal before continuing
- validate empty and unsupported files
- create client-side uploaded-file metadata
- primary action: `Build the map`
- navigate to the file workspace

## Acceptance criteria

- actual local files can be selected
- selected files reach the central store
- no content parsing occurs
- page contains no map or dashboard clutter
- keyboard and reduced-motion behavior work

## Out of scope

- server persistence
- OCR
- file classification
- drag animation into map

## Completion Notes

- Added a keyboard-accessible, multi-file browser upload page for PDF, CSV, TXT, XLSX, XML, and DOCX files.
- Added unsupported-format, empty-file, and empty-submission validation; selected files can be removed before continuing.
- Stores metadata only in the central client-side pipeline store, then navigates to the Files workspace.
- Verified with `npm run lint`, `npm run typecheck`, `npm run build`, and a local HTTP 200 smoke check.
