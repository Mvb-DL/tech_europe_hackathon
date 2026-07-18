import assert from "node:assert/strict";
import test from "node:test";
import { DemoEntityExtractionEngine } from "../src/demo/engines/demo-entity-extraction-engine";
import { DemoEntityLayoutEngine } from "../src/demo/engines/demo-entity-layout-engine";
import { DemoFileMappingEngine } from "../src/demo/engines/demo-file-mapping-engine";
import type {
  MapLayer,
  PipelineEvent,
  UploadedFile,
} from "../src/lib/pipeline/contracts";
import { readMapNodeLayout } from "../src/lib/pipeline/layout";
import {
  reducePipelineEvent,
  type PipelineEventState,
} from "../src/lib/pipeline/reducer";

const dossierId = "dossier-entities";

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
    id: "file-asset",
    dossierId,
    filename: "Asset_Register.xlsx",
    extension: "xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 360,
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

async function getFileLayer(): Promise<MapLayer> {
  const engine = new DemoFileMappingEngine();
  const events: PipelineEvent[] = [];

  for await (const event of engine.run({ dossierId, files })) {
    events.push(event);
  }

  const layer = events.at(-1)?.payload?.layer;
  assert.ok(layer);
  return layer;
}

async function collectEntityEvents(fileLayer: MapLayer) {
  const engine = new DemoEntityExtractionEngine();
  const events: PipelineEvent[] = [];

  for await (const event of engine.run({ dossierId, fileLayer })) {
    events.push(event);
  }

  return events;
}

test("demo entity extraction is deterministic and explicitly candidate-based", async () => {
  const fileLayer = await getFileLayer();
  const firstRun = await collectEntityEvents(fileLayer);
  const secondRun = await collectEntityEvents(fileLayer);

  assert.deepEqual(firstRun, secondRun);
  assert.equal(firstRun[0].type, "entity_extraction.started");
  assert.equal(firstRun.at(-1)?.type, "entity_extraction.completed");
  assert.ok(firstRun.every((event) => event.payload?.demo === true));
  assert.ok(
    firstRun
      .filter((event) => event.type === "entity_extraction.entity_created")
      .every((event) => event.message.includes("candidate")),
  );
});

test("entity snapshots retain lineage and use stable readable layout", async () => {
  const fileLayer = await getFileLayer();
  const events = await collectEntityEvents(fileLayer);
  const initialState: PipelineEventState = {
    events: [],
    mapLayers: [fileLayer],
    processingQueue: [],
    runStatus: "completed",
  };
  const state = events.reduce(reducePipelineEvent, initialState);
  const layer = state.mapLayers.find((currentLayer) => currentLayer.stage === "entities");

  assert.ok(layer);
  assert.ok(layer.nodes.length > 0);
  assert.ok(layer.nodes.every((node) => node.sourceIds.length > 0));
  assert.ok(layer.edges.every((edge) => edge.status === "candidate"));
  assert.ok(layer.edges.every((edge) => edge.sourceIds.length > 0));

  const layoutEngine = new DemoEntityLayoutEngine();
  const firstLayout = await layoutEngine.layout(layer);
  const secondLayout = await layoutEngine.layout(layer);
  const layouts = firstLayout.nodes.map(readMapNodeLayout);

  assert.deepEqual(firstLayout, secondLayout);
  assert.ok(layouts.every((layout) => layout));
  assert.equal(
    new Set(layouts.map((layout) => `${layout?.position.x}:${layout?.position.y}`)).size,
    layouts.length,
  );
});
