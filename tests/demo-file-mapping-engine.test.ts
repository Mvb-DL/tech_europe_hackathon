import assert from "node:assert/strict";
import test from "node:test";
import { DemoFileMapLayoutEngine } from "../src/demo/engines/demo-file-map-layout-engine";
import { DemoFileMappingEngine } from "../src/demo/engines/demo-file-mapping-engine";
import type {
  PipelineEvent,
  UploadedFile,
} from "../src/lib/pipeline/contracts";
import { readMapNodeLayout } from "../src/lib/pipeline/layout";
import {
  reducePipelineEvent,
  type PipelineEventState,
} from "../src/lib/pipeline/reducer";

const dossierId = "dossier-demo";

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

async function collectEvents() {
  const engine = new DemoFileMappingEngine();
  const events: PipelineEvent[] = [];

  for await (const event of engine.run({ dossierId, files })) {
    events.push(event);
  }

  return events;
}

test("demo file mapping is deterministic and clearly labelled", async () => {
  const firstRun = await collectEvents();
  const secondRun = await collectEvents();

  assert.deepEqual(firstRun, secondRun);
  assert.deepEqual(
    firstRun.map((event) => event.type),
    [
      "file_mapping.started",
      "file_mapping.file_reading",
      "file_mapping.file_classified",
      "file_mapping.file_placed",
      "file_mapping.file_reading",
      "file_mapping.file_classified",
      "file_mapping.file_placed",
      "file_mapping.file_reading",
      "file_mapping.file_classified",
      "file_mapping.file_placed",
      "file_mapping.completed",
    ],
  );
  assert.ok(firstRun.every((event) => event.payload?.demo === true));
});

test("event reduction preserves queue, layer snapshots, and source IDs", async () => {
  const events = await collectEvents();
  const initialState: PipelineEventState = {
    events: [],
    mapLayers: [],
    processingQueue: [],
    runStatus: "idle",
  };
  const state = events.reduce(reducePipelineEvent, initialState);
  const layer = state.mapLayers[0];

  assert.equal(state.runStatus, "completed");
  assert.deepEqual(state.processingQueue, []);
  assert.equal(layer.stage, "files");
  assert.equal(layer.nodes.length, 6);
  assert.equal(layer.edges.length, 3);
  assert.ok(layer.nodes.every((node) => node.sourceIds.length > 0));
  assert.ok(layer.edges.every((edge) => edge.sourceIds.length > 0));
});

test("file map layout keeps existing groups stable as files are placed", async () => {
  const events = await collectEvents();
  const placementEvents = events.filter(
    (event) => event.type === "file_mapping.file_placed",
  );
  const layoutEngine = new DemoFileMapLayoutEngine();
  const firstLayer = placementEvents[0].payload?.layer;
  const finalLayer = placementEvents.at(-1)?.payload?.layer;

  assert.ok(firstLayer);
  assert.ok(finalLayer);

  const firstLayout = await layoutEngine.layout(firstLayer);
  const finalLayout = await layoutEngine.layout(finalLayer);
  const firstGroup = firstLayout.nodes.find(
    (node) => node.id === "file-group:general-ledger",
  );
  const finalGroup = finalLayout.nodes.find(
    (node) => node.id === "file-group:general-ledger",
  );
  const fileNodes = finalLayout.nodes.filter((node) => node.kind === "file");

  assert.ok(firstGroup);
  assert.ok(finalGroup);
  assert.deepEqual(readMapNodeLayout(firstGroup), readMapNodeLayout(finalGroup));
  assert.ok(fileNodes.every((node) => node.parentId));
  assert.ok(fileNodes.every((node) => readMapNodeLayout(node)));
});
