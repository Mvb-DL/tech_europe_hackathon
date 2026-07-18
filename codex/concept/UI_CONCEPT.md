# UI Concept — The Layered Dossier Map

## Product idea

The application turns a static dossier into a living, transparent map.

The user first uploads files. The application then visibly processes them one by one. Files move from an ingestion stack into groups on the map. Each later stage adds a new semantic layer above the previous one:

1. Files
2. Entities
3. Sub-entities
4. Profiles
5. Enrichment

The user can move down to the original files at any time.

## Information architecture

### Page 1 — Upload

A separate, intentionally minimal page:

- project name
- one sentence of explanation
- one central multi-file upload area
- selected file count
- primary action: `Build the map`

No dashboard, map, charts, or unnecessary navigation.

### Pages 2–6 — Persistent workspace

All map stages share the same shell and state.

- **Top:** stage rail with Files, Entities, Sub-entities, Profiles, Enrichment
- **Left:** processing buffer or context panel
- **Centre:** zoomable map canvas
- **Right:** inspector for the selected item
- **Bottom:** compact activity stream showing what the system is doing

Use nested Next.js routes under one persistent layout so the workspace does not remount between stages.

Suggested routes:

```text
/dossiers/[dossierId]/workspace/files
/dossiers/[dossierId]/workspace/entities
/dossiers/[dossierId]/workspace/sub-entities
/dossiers/[dossierId]/workspace/profiles
/dossiers/[dossierId]/workspace/enrichment
```

## Layer model

Each stage is a `MapLayer` with its own nodes and edges.

The active layer is fully visible. Earlier layers appear only as a subtle stacked underlay or breadcrumb. Avoid a literal 3D scene; use small vertical offsets, opacity, and transitions to communicate depth without harming readability.

Every node can expose its lineage:

```text
Profile
→ built from Sub-entities
→ extracted from Entities
→ discovered in Files
```

## Page 2 — File Map animation

Initial state:

- empty central canvas
- uploaded files stacked in the left buffer
- first file highlighted as `Reading`

Processing sequence:

1. top file lifts from the stack
2. status changes from `Queued` to `Reading`
3. inspector shows filename, type, size, and current action
4. a destination group is created or highlighted on the map
5. the file card moves visually into that group
6. an activity event is appended
7. the next file becomes active

Example groups:

- General Ledger
- Subledgers
- Assets
- Controls
- Financial Reporting
- Supporting Documents
- Other

If a group already exists, the new file joins the existing group rather than creating another position.

## Page 3 — Entity layer

The canvas transitions one layer upward.

File groups remain traceable underneath, while entity nodes emerge from them. Examples:

- Vendor
- Customer
- User
- Invoice
- Payment
- Asset
- Journal Entry
- Account
- Approval

Edges show `extracted from` or candidate business relationships. The demo must label generated relationships as demo-derived, not proven facts.

## Page 4 — Sub-entity layer

Entities expand into their meaningful components.

Examples:

```text
Vendor
├── Identity
├── Bank Accounts
├── Invoices
├── Payments
├── Receipts
└── Master-data Changes
```

Use nested/group nodes. The user should be able to collapse or expand an entity without losing the overall map.

## Page 5 — Profile layer

Sub-entities consolidate into readable profile nodes.

A profile node should show only high-value information:

- identity
- activity summary
- connected objects
- completeness
- source coverage
- open data gaps

Detailed information belongs in the right inspector, not inside the node.

## Page 6 — Enrichment layer

Profiles receive additional attributes.

Visually distinguish:

- internal dossier data
- external data
- pending enrichment
- unavailable data

The demo may simulate enrichment events but must keep them isolated behind an adapter.

## Transparency rules

At every stage the user can see:

- what is currently being processed
- what changed on the map
- whether the value is uploaded, derived, simulated, or pending
- which previous layer produced the current object
- what data is missing

Do not show fraud claims in this demo.

## Interaction rules

- one primary action per screen
- never animate several major objects simultaneously
- preserve spatial stability where possible
- auto-fit only after meaningful batches, not after every minor change
- selecting a node opens the inspector
- double-clicking or using `Trace source` moves one layer down
- the URL represents the active layer
- support reduced-motion preferences
