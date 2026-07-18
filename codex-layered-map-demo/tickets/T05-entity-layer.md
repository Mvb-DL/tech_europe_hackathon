# T05 — Entity Layer

**Status:** TODO  
**Human owners:** Leo and Mario  
**Depends on:** T04

## Goal

Show how entity candidates emerge from mapped file groups.

## Scope

- create entity layer from demo events
- generic entity types such as Vendor, User, Invoice, Payment, Asset, Account, and Approval
- animate entity nodes emerging from their source groups
- lineage links back to file groups
- label all generated relationships as `demo` or `candidate`
- inspector shows source groups and creation event

## Acceptance criteria

- user can move between file and entity layers
- entity positions are readable and stable
- every entity has at least one source ID
- `Trace to files` navigates down correctly

## Out of scope

- parsing actual rows
- identity resolution
- fraud signals
