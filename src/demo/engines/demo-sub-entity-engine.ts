import type {
  MapEdge,
  MapLayer,
  MapNode,
  PipelineEvent,
  PipelineRunStatus,
  PipelineSnapshotPayload,
} from "@/lib/pipeline/contracts";
import type { SubEntityEngine } from "@/lib/pipeline/engines";

const componentsByEntityTitle: Record<string, string[]> = {
  Account: ["Identity", "Balances", "Journal entries"],
  Approval: ["Approver", "Decision", "Supporting record"],
  Asset: ["Identity", "Register details", "Lifecycle records"],
  Invoice: ["Header", "Line items", "Approval", "Settlement"],
  Payment: ["Instruction", "Counterparty", "Settlement"],
  User: ["Identity", "Access", "Approvals"],
  Vendor: [
    "Identity",
    "Bank accounts",
    "Invoices",
    "Payments",
    "Master-data changes",
  ],
};

function groupId(entityId: string) {
  return `sub-entity-group:${entityId}`;
}

function subEntityId(entityId: string, title: string) {
  return `sub-entity:${entityId}:${title.toLowerCase().replaceAll(" ", "-")}`;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function createInitialLayer(dossierId: string, entityLayer: MapLayer): MapLayer {
  return {
    id: `layer:sub-entities:${dossierId}`,
    stage: "sub_entities",
    title: "Sub-Entity Layer",
    nodes: [],
    edges: [],
    createdAt: entityLayer.createdAt,
  };
}

function createParentNode(layerId: string, entity: MapNode): MapNode {
  const components = componentsByEntityTitle[entity.title] ?? ["Identity"];

  return {
    id: groupId(entity.id),
    layerId,
    kind: "entity",
    title: entity.title,
    subtitle: "Demo entity candidate",
    status: "ready",
    sourceIds: entity.sourceIds,
    data: {
      childCount: components.length,
      derivation: "demo",
      parentEntityId: entity.id,
      sourceGroupIds: readStringArray(entity.data.sourceGroupIds),
      sourceGroupTitles: readStringArray(entity.data.sourceGroupTitles),
    },
  };
}

function createChildNode(layerId: string, entity: MapNode, title: string): MapNode {
  return {
    id: subEntityId(entity.id, title),
    layerId,
    kind: "sub_entity",
    parentId: groupId(entity.id),
    title,
    subtitle: "Demo-derived component",
    status: "ready",
    sourceIds: entity.sourceIds,
    data: {
      derivation: "demo",
      parentEntityId: entity.id,
      parentTitle: entity.title,
      sourceGroupIds: readStringArray(entity.data.sourceGroupIds),
      sourceGroupTitles: readStringArray(entity.data.sourceGroupTitles),
    },
  };
}

function createChildEdge(layerId: string, parent: MapNode, child: MapNode): MapEdge {
  return {
    id: `edge:${parent.id}:${child.id}`,
    layerId,
    source: parent.id,
    target: child.id,
    relation: "demo component",
    status: "demo",
    sourceIds: child.sourceIds,
  };
}

function createPayload(
  layer: MapLayer,
  runStatus: PipelineRunStatus,
): PipelineSnapshotPayload {
  return { demo: true, layer, runStatus };
}

export class DemoSubEntityEngine implements SubEntityEngine {
  async *run(input: {
    dossierId: string;
    entityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent> {
    const parsedTimestampBase = Date.parse(input.entityLayer.createdAt);
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
      layer: MapLayer,
      runStatus: PipelineRunStatus,
    ): PipelineEvent => ({
      id: eventId(type, sequence),
      dossierId: input.dossierId,
      stage: "sub_entities",
      type,
      timestamp: timestampFor(sequence),
      status,
      message,
      subjectId,
      payload: createPayload(layer, runStatus),
    });

    let sequence = 0;
    let layer = createInitialLayer(input.dossierId, input.entityLayer);

    yield createEvent(
      sequence++,
      "sub_entity_extraction.started",
      "running",
      "Demo sub-entity expansion started from entity candidates.",
      undefined,
      layer,
      "running",
    );

    for (const entity of input.entityLayer.nodes.filter(
      (node) => node.kind === "entity",
    )) {
      const parent = createParentNode(layer.id, entity);
      layer = { ...layer, nodes: [...layer.nodes, parent] };

      yield createEvent(
        sequence++,
        "sub_entity_extraction.parent_created",
        "completed",
        `Demo expanded the ${entity.title} candidate into components.`,
        parent.id,
        layer,
        "running",
      );

      for (const title of componentsByEntityTitle[entity.title] ?? ["Identity"]) {
        const child = createChildNode(layer.id, entity, title);
        layer = {
          ...layer,
          nodes: [...layer.nodes, child],
          edges: [...layer.edges, createChildEdge(layer.id, parent, child)],
        };

        yield createEvent(
          sequence++,
          "sub_entity_extraction.component_created",
          "completed",
          `Demo added the ${title} component under ${entity.title}.`,
          child.id,
          layer,
          "running",
        );
      }
    }

    yield createEvent(
      sequence,
      "sub_entity_extraction.completed",
      "completed",
      "Demo sub-entity expansion completed.",
      undefined,
      layer,
      "completed",
    );
  }
}
