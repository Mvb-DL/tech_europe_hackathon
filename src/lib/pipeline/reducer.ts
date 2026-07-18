import type {
  MapLayer,
  PipelineEvent,
  PipelineRunStatus,
} from "./contracts";

export type PipelineEventState = {
  events: PipelineEvent[];
  mapLayers: MapLayer[];
  processingQueue: string[];
  runStatus: PipelineRunStatus;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMapLayer(value: unknown): value is MapLayer {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.stage === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges) &&
    typeof value.createdAt === "string"
  );
}

function isPipelineRunStatus(value: unknown): value is PipelineRunStatus {
  return (
    value === "idle" ||
    value === "running" ||
    value === "paused" ||
    value === "completed" ||
    value === "failed"
  );
}

export function upsertMapLayer(layers: MapLayer[], layer: MapLayer) {
  const layerIndex = layers.findIndex((currentLayer) => currentLayer.id === layer.id);

  if (layerIndex === -1) {
    return [...layers, layer];
  }

  return layers.map((currentLayer) =>
    currentLayer.id === layer.id ? layer : currentLayer,
  );
}

export function reducePipelineEvent(
  state: PipelineEventState,
  event: PipelineEvent,
): PipelineEventState {
  const payload = event.payload;
  const processingQueue = isStringArray(payload?.queue)
    ? payload.queue
    : state.processingQueue;
  const mapLayers = isMapLayer(payload?.layer)
    ? upsertMapLayer(state.mapLayers, payload.layer)
    : state.mapLayers;
  const runStatus = isPipelineRunStatus(payload?.runStatus)
    ? payload.runStatus
    : state.runStatus;

  return {
    events: [...state.events, event],
    mapLayers,
    processingQueue,
    runStatus,
  };
}
