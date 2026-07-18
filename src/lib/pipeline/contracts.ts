import type { SourceId } from "@/lib/domain";

export type PipelineStage =
  | "upload"
  | "files"
  | "entities"
  | "sub_entities"
  | "profiles"
  | "enrichment";

export type PipelineEventStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type PipelineRunStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export type PipelineEvent = {
  id: string;
  dossierId: string;
  stage: PipelineStage;
  type: string;
  timestamp: string;
  status: PipelineEventStatus;
  message: string;
  subjectId?: string;
  payload?: PipelineSnapshotPayload;
};

export type UploadedFile = {
  id: SourceId;
  dossierId: string;
  filename: string;
  relativePath?: string;
  extension: string;
  mimeType: string;
  size: number;
  lastModified: number;
};

export type MapNodeKind =
  | "file"
  | "file_group"
  | "entity"
  | "sub_entity"
  | "profile"
  | "enrichment";

export type MapNodeStatus =
  | "queued"
  | "processing"
  | "ready"
  | "warning"
  | "pending";

export type MapNode = {
  id: string;
  layerId: string;
  kind: MapNodeKind;
  title: string;
  subtitle?: string;
  status: MapNodeStatus;
  parentId?: string;
  sourceIds: SourceId[];
  data: Record<string, unknown>;
};

export type MapEdgeStatus = "demo" | "candidate" | "observed";

export type MapEdge = {
  id: string;
  layerId: string;
  source: string;
  target: string;
  relation: string;
  status: MapEdgeStatus;
  sourceIds: SourceId[];
};

export type MapLayer = {
  id: string;
  stage: PipelineStage;
  title: string;
  nodes: MapNode[];
  edges: MapEdge[];
  createdAt: string;
};

export type PipelineSnapshotPayload = Record<string, unknown> & {
  queue?: string[];
  layer?: MapLayer;
  runStatus?: PipelineRunStatus;
};
