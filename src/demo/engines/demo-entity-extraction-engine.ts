import type {
  MapEdge,
  MapLayer,
  MapNode,
  PipelineEvent,
  PipelineRunStatus,
  PipelineSnapshotPayload,
} from "@/lib/pipeline/contracts";
import type { EntityExtractionEngine } from "@/lib/pipeline/engines";

type EntityType =
  | "Vendor"
  | "User"
  | "Invoice"
  | "Payment"
  | "Asset"
  | "Account"
  | "Approval";

type EntityCandidate = {
  sourceGroupIds: string[];
  sourceGroupTitles: string[];
  sourceIds: string[];
  type: EntityType;
};

const entityOrder: EntityType[] = [
  "Vendor",
  "User",
  "Invoice",
  "Payment",
  "Asset",
  "Account",
  "Approval",
];

const entityTypesByGroupTitle: Record<string, EntityType[]> = {
  Assets: ["Asset"],
  Controls: ["User", "Approval"],
  "Financial Reporting": ["Account"],
  "General Ledger": ["Account", "Invoice"],
  Other: ["User"],
  Subledgers: ["Vendor", "Payment"],
  "Supporting Documents": ["Invoice"],
};

const candidateRelations: Array<{
  source: EntityType;
  target: EntityType;
}> = [
  { source: "Vendor", target: "Invoice" },
  { source: "Invoice", target: "Payment" },
  { source: "User", target: "Approval" },
  { source: "Account", target: "Invoice" },
  { source: "Asset", target: "Account" },
];

function entityId(type: EntityType) {
  return `entity:${type.toLowerCase()}`;
}

function createInitialLayer(dossierId: string, fileLayer: MapLayer): MapLayer {
  return {
    id: `layer:entities:${dossierId}`,
    stage: "entities",
    title: "Entity Layer",
    nodes: [],
    edges: [],
    createdAt: fileLayer.createdAt,
  };
}

function buildCandidates(fileLayer: MapLayer): EntityCandidate[] {
  const candidates = new Map<EntityType, EntityCandidate>();

  for (const group of fileLayer.nodes.filter(
    (node) => node.kind === "file_group",
  )) {
    for (const type of entityTypesByGroupTitle[group.title] ?? []) {
      const candidate = candidates.get(type) ?? {
        sourceGroupIds: [],
        sourceGroupTitles: [],
        sourceIds: [],
        type,
      };

      candidate.sourceGroupIds.push(group.id);
      candidate.sourceGroupTitles.push(group.title);
      candidate.sourceIds.push(...group.sourceIds);
      candidates.set(type, candidate);
    }
  }

  return entityOrder
    .filter((type) => candidates.has(type))
    .map((type) => {
      const candidate = candidates.get(type)!;

      return {
        ...candidate,
        sourceGroupIds: [...new Set(candidate.sourceGroupIds)].sort(),
        sourceGroupTitles: [...new Set(candidate.sourceGroupTitles)].sort(),
        sourceIds: [...new Set(candidate.sourceIds)].sort(),
      };
    });
}

function createEntityNode(
  layerId: string,
  candidate: EntityCandidate,
  creationEventId: string,
): MapNode {
  return {
    id: entityId(candidate.type),
    layerId,
    kind: "entity",
    title: candidate.type,
    subtitle: "Demo-derived candidate",
    status: "ready",
    sourceIds: candidate.sourceIds,
    data: {
      creationEventId,
      derivation: "demo",
      relationStatus: "candidate",
      sourceGroupIds: candidate.sourceGroupIds,
      sourceGroupTitles: candidate.sourceGroupTitles,
    },
  };
}

function connectAvailableCandidates(layer: MapLayer): MapEdge[] {
  const nodeByType = new Map(layer.nodes.map((node) => [node.title, node]));

  return candidateRelations.flatMap((relation) => {
    const source = nodeByType.get(relation.source);
    const target = nodeByType.get(relation.target);

    if (!source || !target) {
      return [];
    }

    const id = `edge:${source.id}:${target.id}`;

    if (layer.edges.some((edge) => edge.id === id)) {
      return [];
    }

    return [
      {
        id,
        layerId: layer.id,
        source: source.id,
        target: target.id,
        relation: "candidate relationship",
        status: "candidate",
        sourceIds: [...new Set([...source.sourceIds, ...target.sourceIds])].sort(),
      },
    ];
  });
}

function createPayload(
  layer: MapLayer,
  runStatus: PipelineRunStatus,
  details: Record<string, unknown> = {},
): PipelineSnapshotPayload {
  return {
    ...details,
    demo: true,
    layer,
    runStatus,
  };
}

export class DemoEntityExtractionEngine implements EntityExtractionEngine {
  async *run(input: {
    dossierId: string;
    fileLayer: MapLayer;
  }): AsyncIterable<PipelineEvent> {
    const candidates = buildCandidates(input.fileLayer);
    const parsedTimestampBase = Date.parse(input.fileLayer.createdAt);
    const timestampBase = Number.isFinite(parsedTimestampBase)
      ? parsedTimestampBase
      : 0;
    const timestampFor = (sequence: number) =>
      new Date(timestampBase + sequence * 1000).toISOString();
    const eventId = (type: string, sequence: number) =>
      `${input.dossierId}:${type}:${sequence}`;
    const createEvent = (
      sequence: number,
      type: string,
      status: PipelineEvent["status"],
      message: string,
      subjectId: string | undefined,
      payload: PipelineSnapshotPayload,
    ): PipelineEvent => ({
      id: eventId(type, sequence),
      dossierId: input.dossierId,
      stage: "entities",
      type,
      timestamp: timestampFor(sequence),
      status,
      message,
      subjectId,
      payload,
    });

    let sequence = 0;
    let layer = createInitialLayer(input.dossierId, input.fileLayer);

    yield createEvent(
      sequence++,
      "entity_extraction.started",
      "running",
      "Demo entity extraction started from file groups.",
      undefined,
      createPayload(layer, "running"),
    );

    for (const candidate of candidates) {
      const type = candidate.type;
      const creationEventId = eventId(
        "entity_extraction.entity_created",
        sequence,
      );
      const entityNode = createEntityNode(layer.id, candidate, creationEventId);
      const nextLayer = {
        ...layer,
        nodes: [...layer.nodes, entityNode],
      };

      layer = {
        ...nextLayer,
        edges: [...nextLayer.edges, ...connectAvailableCandidates(nextLayer)],
      };

      yield createEvent(
        sequence++,
        "entity_extraction.entity_created",
        "completed",
        `Demo created a ${type} candidate from ${candidate.sourceGroupTitles.join(
          ", ",
        )}.`,
        entityNode.id,
        createPayload(layer, "running", {
          sourceGroupIds: candidate.sourceGroupIds,
        }),
      );
    }

    yield createEvent(
      sequence,
      "entity_extraction.completed",
      "completed",
      "Demo entity extraction completed.",
      undefined,
      createPayload(layer, "completed"),
    );
  }
}
