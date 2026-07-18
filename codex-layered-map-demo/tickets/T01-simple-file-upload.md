# T01 — Simple File Upload

**Status:** TODO  
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
