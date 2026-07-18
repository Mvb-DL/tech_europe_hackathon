# Architecture Contract — Replaceable Demo Logic

## Goal

Build the complete frontend experience now without coupling it to future extraction agents.

The UI must not know whether events come from:

- a deterministic demo engine
- local parsers
- API routes
- background jobs
- AI agents

## Core contracts

```ts
export type PipelineStage =
  | "upload"
  | "files"
  | "entities"
  | "sub_entities"
  | "profiles"
  | "enrichment";

export type PipelineEvent = {
  id: string;
  dossierId: string;
  stage: PipelineStage;
  type: string;
  timestamp: string;
  status: "queued" | "running" | "completed" | "failed";
  message: string;
  subjectId?: string;
  payload?: Record<string, unknown>;
};

export type MapNodeKind =
  | "file"
  | "file_group"
  | "entity"
  | "sub_entity"
  | "profile"
  | "enrichment";

export type MapNode = {
  id: string;
  layerId: string;
  kind: MapNodeKind;
  title: string;
  subtitle?: string;
  status: "queued" | "processing" | "ready" | "warning" | "pending";
  parentId?: string;
  sourceIds: string[];
  data: Record<string, unknown>;
};

export type MapEdge = {
  id: string;
  layerId: string;
  source: string;
  target: string;
  relation: string;
  status: "demo" | "candidate" | "observed";
  sourceIds: string[];
};

export type MapLayer = {
  id: string;
  stage: PipelineStage;
  title: string;
  nodes: MapNode[];
  edges: MapEdge[];
  createdAt: string;
};
```

## Engine interfaces

```ts
export interface FileMappingEngine {
  run(input: {
    dossierId: string;
    files: UploadedFile[];
  }): AsyncIterable<PipelineEvent>;
}

export interface EntityExtractionEngine {
  run(input: {
    dossierId: string;
    fileLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface SubEntityEngine {
  run(input: {
    dossierId: string;
    entityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface ProfileEngine {
  run(input: {
    dossierId: string;
    subEntityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface EnrichmentEngine {
  run(input: {
    dossierId: string;
    profileLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}
```

## Demo adapters

Place simulated logic under one clearly named area:

```text
src/demo/
├── engines/
├── fixtures/
└── rules/
```

Production-facing interfaces belong under:

```text
src/lib/pipeline/
```

UI components may import contracts and stores, but must never import demo rules directly.

## State ownership

Use a central store for:

- uploaded file metadata
- processing queue
- pipeline events
- map layers
- active layer
- selected node
- playback speed

The store consumes events and updates the graph. Engines emit events; they do not manipulate UI state directly.

## Layout contract

Graph layout must be behind an adapter:

```ts
export interface GraphLayoutEngine {
  layout(layer: MapLayer): Promise<MapLayer>;
}
```

This allows a simple deterministic layout first and ELK later without changing map components.

## Non-negotiable boundaries

- no fraud logic in UI components
- no sample ground-truth answers
- no engine-specific conditions in map nodes
- no direct parsing inside React components
- no direct network calls inside node components
- all asynchronous progress represented as events
- every generated object retains `sourceIds`
