"use client";

import type { FileConnection, FileMap, FileMappingEvent, FileMappingResult } from "../domain/contracts";
import type { MapLayer, MapNode, PipelineEvent, UploadedFile } from "@/lib/pipeline/contracts";
import type { FileMappingEngine } from "@/lib/pipeline/engines";
import { domainLabels } from "../domain/taxonomy";

function initialLayer(dossierId: string): MapLayer { return { id: `layer:files:${dossierId}`, stage: "files", title: "File Map", nodes: [], edges: [], createdAt: new Date().toISOString() }; }
function queuedLayer(dossierId: string, files: UploadedFile[]): MapLayer {
  const layer = initialLayer(dossierId);
  const queueGroupId = "file-group:agent-intake";
  return {
    ...layer,
    nodes: [
      {
        id: queueGroupId,
        layerId: layer.id,
        kind: "file_group",
        title: "Agent sorting queue",
        status: "processing",
        sourceIds: files.map((file) => file.id),
        data: {
          domain: "agent_queue",
          fileCount: files.length,
          groupReason: "Uploaded files waiting for agent classification.",
        },
      },
      ...files.map<MapNode>((file) => ({
        id: `file:${file.id}`,
        layerId: layer.id,
        kind: "file",
        title: file.filename,
        subtitle: `${file.extension.toUpperCase()} · queued`,
        status: "queued",
        parentId: queueGroupId,
        sourceIds: [file.id],
        data: {},
      })),
    ],
    edges: files.map((file) => ({
      id: `edge:${queueGroupId}:file:${file.id}`,
      layerId: layer.id,
      source: queueGroupId,
      target: `file:${file.id}`,
      relation: "queued_for_mapping",
      status: "candidate",
      sourceIds: [file.id],
    })),
  };
}
function event(dossierId: string, source: FileMappingEvent, status: PipelineEvent["status"], payload: PipelineEvent["payload"], subjectId = source.fileId): PipelineEvent { return { id: `${dossierId}:${source.type}:${source.timestamp}:${subjectId ?? "map"}`, dossierId, stage: "files", type: source.type.replaceAll(".", "_"), timestamp: source.timestamp, status, message: source.message, subjectId, payload }; }
function groupNodeId(result: FileMappingResult) { return `file-group:${result.groupId ?? result.primaryDomain}`; }
function remainingQueue(layer: MapLayer, files: UploadedFile[]) {
  const placedFileIds = new Set(
    layer.nodes
      .filter((node) => node.kind === "file" && node.parentId !== "file-group:agent-intake")
      .flatMap((node) => node.sourceIds),
  );

  return files
    .filter((file) => !placedFileIds.has(file.id))
    .map((file) => file.id);
}
function addFile(layer: MapLayer, result: FileMappingResult, file: UploadedFile, fingerprint: Record<string, unknown> | undefined): MapLayer {
  const groupId = groupNodeId(result); const existing = layer.nodes.find((node) => node.id === groupId);
  const group: MapNode = { id: groupId, layerId: layer.id, kind: "file_group", title: result.groupLabel ?? domainLabels[result.primaryDomain], status: "ready", sourceIds: [...new Set([...(existing?.sourceIds ?? []), file.id])], data: { domain: result.primaryDomain, fileCount: (existing?.sourceIds.length ?? 0) + 1, groupReason: result.groupReason, isDynamic: Boolean(result.groupId) } };
  const node: MapNode = { id: `file:${file.id}`, layerId: layer.id, kind: "file", title: file.filename, subtitle: `${result.documentRole} · ${Math.round(result.confidence * 100)}%`, status: result.primaryDomain === "unknown" ? "warning" : "ready", parentId: groupId, sourceIds: [file.id], data: { result, fingerprint } };
  const nodesWithoutMovedFile = layer.nodes.filter((current) => current.id !== node.id);
  const edgesWithoutMovedFile = layer.edges.filter((edge) => edge.target !== node.id);
  return { ...layer, nodes: [...(existing ? nodesWithoutMovedFile.map((current) => current.id === groupId ? group : current) : [...nodesWithoutMovedFile, group]), node], edges: [...edgesWithoutMovedFile, { id: `edge:${groupId}:${node.id}`, layerId: layer.id, source: groupId, target: node.id, relation: "contains", status: "observed", sourceIds: [file.id] }] };
}
function addConnection(layer: MapLayer, connection: FileConnection): MapLayer { return { ...layer, edges: [...layer.edges, { id: connection.id, layerId: layer.id, source: `file:${connection.sourceFileId}`, target: `file:${connection.targetFileId}`, relation: connection.relationship, status: connection.status === "confirmed" ? "observed" : "candidate", sourceIds: [connection.sourceFileId, connection.targetFileId] }] }; }

export class ApiFileMappingEngine implements FileMappingEngine {
  async *run(input: { dossierId: string; files: UploadedFile[] }): AsyncIterable<PipelineEvent> {
    let layer = queuedLayer(input.dossierId, input.files);
    yield {
      id: `${input.dossierId}:file_mapping.client_started`,
      dossierId: input.dossierId,
      stage: "files",
      type: "file_mapping_started",
      timestamp: new Date().toISOString(),
      status: "running",
      message: input.files[0]
        ? `Inspecting ${input.files[0].filename}.`
        : "File mapping started.",
      subjectId: input.files[0]?.id,
      payload: {
        demo: false,
        layer,
        queue: input.files.map((file) => file.id),
        runStatus: "running",
      },
    };
    const response = await fetch(`/api/dossiers/${encodeURIComponent(input.dossierId)}/mapping`, { method: "POST" });
    if (!response.ok) throw new Error("Mapping request failed.");
    const payload = await response.json() as { fileMap: FileMap; events: FileMappingEvent[] };
    const results = new Map(payload.fileMap.files.map((result) => [result.fileId, result])); const files = new Map(input.files.map((file) => [file.id, file])); const fingerprints = new Map<string, Record<string, unknown>>();
    for (const source of payload.events) {
      if (source.type === "file.fingerprint.created" && source.fileId) fingerprints.set(source.fileId, (source.payload?.fingerprint as Record<string, unknown>) ?? {});
      if (source.type === "file.assigned" && source.fileId) { const result = results.get(source.fileId); const file = files.get(source.fileId); if (result && file) layer = addFile(layer, result, file, fingerprints.get(source.fileId)); yield event(input.dossierId, source, "completed", { demo: false, layer, queue: remainingQueue(layer, input.files), runStatus: "running" }); continue; }
      if (source.type === "file.connection.discovered") { const connection = source.payload?.connection as FileConnection | undefined; if (connection) layer = addConnection(layer, connection); yield event(input.dossierId, source, "completed", { demo: false, layer, runStatus: "running" }, undefined); continue; }
      const completed = source.type === "mapping.completed"; yield event(input.dossierId, source, completed ? "completed" : "running", { demo: false, layer, queue: remainingQueue(layer, input.files), runStatus: completed ? "completed" : "running" });
    }
  }
}
