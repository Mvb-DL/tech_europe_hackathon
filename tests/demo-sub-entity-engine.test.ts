import assert from "node:assert/strict";
import test from "node:test";
import { DemoEntityExtractionEngine } from "../src/demo/engines/demo-entity-extraction-engine";
import { DemoFileMappingEngine } from "../src/demo/engines/demo-file-mapping-engine";
import { DemoSubEntityEngine } from "../src/demo/engines/demo-sub-entity-engine";
import { DemoSubEntityLayoutEngine } from "../src/demo/engines/demo-sub-entity-layout-engine";
import type {
  MapLayer,
  UploadedFile,
} from "../src/lib/pipeline/contracts";
import { readMapNodeLayout } from "../src/lib/pipeline/layout";
import {
  reducePipelineEvent,
  type PipelineEventState,
} from "../src/lib/pipeline/reducer";

const dossierId = "dossier-sub-entities";

const files: UploadedFile[] = [
  {
    id: "file-account",
    dossierId,
    filename: "Account_Overview.csv",
    extension: "csv",
    mimeType: "text/csv",
    size: 120,
    lastModified: 1_704_067_200_000,
  },
  {
    id: "file-vendor",
    dossierId,
    filename: "Vendor_Master.csv",
    extension: "csv",
    mimeType: "text/csv",
    size: 240,
    lastModified: 1_704_067_200_000,
  },
];

async function collectEvents<T>(events: AsyncIterable<T>) {
  const collected: T[] = [];

  for await (const event of events) {
    collected.push(event);
  }

  return collected;
}

async function getEntityLayer(): Promise<MapLayer> {
  const fileEvents = await collectEvents(
    new DemoFileMappingEngine().run({ dossierId, files }),
  );
  const fileLayer = fileEvents.at(-1)?.payload?.layer;
  assert.ok(fileLayer);
  const entityEvents = await collectEvents(
    new DemoEntityExtractionEngine().run({ dossierId, fileLayer }),
  );
  const entityLayer = entityEvents.at(-1)?.payload?.layer;
  assert.ok(entityLayer);
  return entityLayer;
}

test("demo sub-entity expansion is deterministic and marked as demo output", async () => {
  const entityLayer = await getEntityLayer();
  const firstRun = await collectEvents(
    new DemoSubEntityEngine().run({ dossierId, entityLayer }),
  );
  const secondRun = await collectEvents(
    new DemoSubEntityEngine().run({ dossierId, entityLayer }),
  );

  assert.deepEqual(firstRun, secondRun);
  assert.equal(firstRun[0].type, "sub_entity_extraction.started");
  assert.equal(firstRun.at(-1)?.type, "sub_entity_extraction.completed");
  assert.ok(firstRun.every((event) => event.payload?.demo === true));
});

test("sub-entity snapshots retain parent and file lineage with nested stable layout", async () => {
  const entityLayer = await getEntityLayer();
  const events = await collectEvents(
    new DemoSubEntityEngine().run({ dossierId, entityLayer }),
  );
  const initialState: PipelineEventState = {
    events: [],
    mapLayers: [entityLayer],
    processingQueue: [],
    runStatus: "completed",
  };
  const state = events.reduce(reducePipelineEvent, initialState);
  const layer = state.mapLayers.find(
    (currentLayer) => currentLayer.stage === "sub_entities",
  );

  assert.ok(layer);
  const parents = layer.nodes.filter((node) => node.kind === "entity");
  const children = layer.nodes.filter((node) => node.kind === "sub_entity");
  assert.ok(parents.length > 0);
  assert.ok(children.length > 0);
  assert.ok(children.every((node) => node.parentId));
  assert.ok(children.every((node) => node.sourceIds.length > 0));
  assert.ok(
    children.every((node) =>
      parents.some((parent) => parent.id === node.parentId),
    ),
  );
  assert.ok(layer.edges.every((edge) => edge.status === "demo"));

  const layoutEngine = new DemoSubEntityLayoutEngine();
  const firstLayout = await layoutEngine.layout(layer);
  const secondLayout = await layoutEngine.layout(layer);

  assert.deepEqual(firstLayout, secondLayout);
  assert.ok(firstLayout.nodes.every((node) => readMapNodeLayout(node)));
  assert.ok(
    firstLayout.nodes
      .filter((node) => node.kind === "sub_entity")
      .every((node) => readMapNodeLayout(node)?.position.x === 14),
  );
});
