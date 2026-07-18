import type {
  MapLayer,
  MapNode,
  PipelineEvent,
  PipelineRunStatus,
  PipelineSnapshotPayload,
  UploadedFile,
} from "@/lib/pipeline/contracts";
import type { FileMappingEngine } from "@/lib/pipeline/engines";
import {
  categorizeDemoFile,
  type DemoFileCategory,
} from "../rules/file-categorization";

function stableFiles(files: UploadedFile[]) {
  return [...files].sort(
    (left, right) =>
      left.filename.localeCompare(right.filename) ||
      left.extension.localeCompare(right.extension) ||
      left.size - right.size ||
      left.lastModified - right.lastModified,
  );
}

function layerCreatedAt(files: UploadedFile[]) {
  const latestFileTimestamp = Math.max(
    0,
    ...files.map((file) => file.lastModified),
  );

  return new Date(latestFileTimestamp).toISOString();
}

function createInitialFileLayer(
  dossierId: string,
  files: UploadedFile[],
): MapLayer {
  return {
    id: `layer:files:${dossierId}`,
    stage: "files",
    title: "File Map",
    nodes: [],
    edges: [],
    createdAt: layerCreatedAt(files),
  };
}

function placeFile(
  layer: MapLayer,
  file: UploadedFile,
  category: DemoFileCategory,
): MapLayer {
  const groupId = `file-group:${category.id}`;
  const existingGroup = layer.nodes.find((node) => node.id === groupId);
  const groupNode: MapNode = {
    id: groupId,
    layerId: layer.id,
    kind: "file_group",
    title: category.title,
    status: "ready",
    sourceIds: Array.from(
      new Set([...(existingGroup?.sourceIds ?? []), file.id]),
    ).sort(),
    data: {
      classification: "demo",
      classificationBasis: "filename and extension",
    },
  };
  const fileNode: MapNode = {
    id: `file:${file.id}`,
    layerId: layer.id,
    kind: "file",
    title: file.filename,
    subtitle: `${file.extension.toUpperCase()} file`,
    status: "ready",
    parentId: groupId,
    sourceIds: [file.id],
    data: {
      classification: "demo",
      classificationBasis: "filename and extension",
    },
  };
  const nodes = existingGroup
    ? layer.nodes.map((node) => (node.id === groupId ? groupNode : node))
    : [...layer.nodes, groupNode];

  return {
    ...layer,
    nodes: [...nodes, fileNode],
    edges: [
      ...layer.edges,
      {
        id: `edge:${groupId}:file:${file.id}`,
        layerId: layer.id,
        source: groupId,
        target: fileNode.id,
        relation: "contains",
        status: "demo",
        sourceIds: [file.id],
      },
    ],
  };
}

function createPayload(
  queue: string[],
  layer: MapLayer,
  runStatus: PipelineRunStatus,
  details: Record<string, unknown> = {},
): PipelineSnapshotPayload {
  return {
    ...details,
    demo: true,
    layer,
    queue,
    runStatus,
  };
}

export class DemoFileMappingEngine implements FileMappingEngine {
  async *run(input: {
    dossierId: string;
    files: UploadedFile[];
  }): AsyncIterable<PipelineEvent> {
    const files = stableFiles(input.files);
    const initialTimestamp = Math.max(0, ...files.map((file) => file.lastModified));
    const timestampFor = (sequence: number) =>
      new Date(initialTimestamp + sequence * 1000).toISOString();
    const createEvent = (
      sequence: number,
      type: string,
      status: PipelineEvent["status"],
      message: string,
      subjectId: string | undefined,
      payload: PipelineSnapshotPayload,
    ): PipelineEvent => ({
      id: `${input.dossierId}:${type}:${sequence}`,
      dossierId: input.dossierId,
      stage: "files",
      type,
      timestamp: timestampFor(sequence),
      status,
      message,
      subjectId,
      payload,
    });

    let sequence = 0;
    let queue = files.map((file) => file.id);
    let layer = createInitialFileLayer(input.dossierId, files);

    yield createEvent(
      sequence++,
      "file_mapping.started",
      "running",
      "Demo file mapping started.",
      undefined,
      createPayload(queue, layer, "running"),
    );

    for (const file of files) {
      yield createEvent(
        sequence++,
        "file_mapping.file_reading",
        "running",
        `Demo is reading ${file.filename}.`,
        file.id,
        createPayload(queue, layer, "running"),
      );

      const category = categorizeDemoFile(file);

      yield createEvent(
        sequence++,
        "file_mapping.file_classified",
        "running",
        `Demo classified ${file.filename} as ${category.title} using its filename and extension.`,
        file.id,
        createPayload(queue, layer, "running", {
          category: category.title,
        }),
      );

      layer = placeFile(layer, file, category);
      queue = queue.filter((fileId) => fileId !== file.id);

      yield createEvent(
        sequence++,
        "file_mapping.file_placed",
        "completed",
        `Demo placed ${file.filename} in ${category.title}.`,
        file.id,
        createPayload(queue, layer, "running", {
          category: category.title,
        }),
      );
    }

    yield createEvent(
      sequence,
      "file_mapping.completed",
      "completed",
      "Demo file mapping completed.",
      undefined,
      createPayload(queue, layer, "completed"),
    );
  }
}
