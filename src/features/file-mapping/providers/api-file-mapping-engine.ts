"use client";

import type { FileConnection, FileMap, FileMappingEvent, FileMappingResult } from "../domain/contracts";
import type { MapLayer, MapNode, PipelineEvent, UploadedFile } from "@/lib/pipeline/contracts";
import type { FileMappingEngine } from "@/lib/pipeline/engines";
import { domainLabels } from "../domain/taxonomy";

function initialLayer(dossierId: string): MapLayer { return { id: `layer:files:${dossierId}`, stage: "files", title: "File Map", nodes: [], edges: [], createdAt: new Date().toISOString() }; }
function event(dossierId: string, source: FileMappingEvent, status: PipelineEvent["status"], payload: PipelineEvent["payload"], subjectId = source.fileId): PipelineEvent { return { id: `${dossierId}:${source.type}:${source.timestamp}:${subjectId ?? "map"}`, dossierId, stage: "files", type: source.type.replaceAll(".", "_"), timestamp: source.timestamp, status, message: source.message, subjectId, payload }; }
function addFile(layer: MapLayer, result: FileMappingResult, file: UploadedFile, fingerprint: Record<string, unknown> | undefined): MapLayer {
  const groupId = `file-group:${result.primaryDomain}`; const existing = layer.nodes.find((node) => node.id === groupId);
  const group: MapNode = { id: groupId, layerId: layer.id, kind: "file_group", title: domainLabels[result.primaryDomain], status: "ready", sourceIds: [...new Set([...(existing?.sourceIds ?? []), file.id])], data: { domain: result.primaryDomain, fileCount: (existing?.sourceIds.length ?? 0) + 1 } };
  const node: MapNode = { id: `file:${file.id}`, layerId: layer.id, kind: "file", title: file.filename, subtitle: `${result.documentRole} · ${Math.round(result.confidence * 100)}%`, status: result.primaryDomain === "unknown" ? "warning" : "ready", parentId: groupId, sourceIds: [file.id], data: { result, fingerprint } };
  return { ...layer, nodes: [...(existing ? layer.nodes.map((current) => current.id === groupId ? group : current) : [...layer.nodes, group]), node], edges: [...layer.edges, { id: `edge:${groupId}:${node.id}`, layerId: layer.id, source: groupId, target: node.id, relation: "contains", status: "observed", sourceIds: [file.id] }] };
}
function addConnection(layer: MapLayer, connection: FileConnection): MapLayer { return { ...layer, edges: [...layer.edges, { id: connection.id, layerId: layer.id, source: `file:${connection.sourceFileId}`, target: `file:${connection.targetFileId}`, relation: connection.relationship, status: connection.status === "confirmed" ? "observed" : "candidate", sourceIds: [connection.sourceFileId, connection.targetFileId] }] }; }

export class ApiFileMappingEngine implements FileMappingEngine {
  async *run(input: { dossierId: string; files: UploadedFile[] }): AsyncIterable<PipelineEvent> {
    const response = await fetch(`/api/dossiers/${encodeURIComponent(input.dossierId)}/mapping`, { method: "POST" });
    if (!response.ok) throw new Error("Mapping request failed.");
    const payload = await response.json() as { fileMap: FileMap; events: FileMappingEvent[] };
    const results = new Map(payload.fileMap.files.map((result) => [result.fileId, result])); const files = new Map(input.files.map((file) => [file.id, file])); const fingerprints = new Map<string, Record<string, unknown>>(); let layer = initialLayer(input.dossierId);
    for (const source of payload.events) {
      if (source.type === "file.fingerprint.created" && source.fileId) fingerprints.set(source.fileId, (source.payload?.fingerprint as Record<string, unknown>) ?? {});
      if (source.type === "file.assigned" && source.fileId) { const result = results.get(source.fileId); const file = files.get(source.fileId); if (result && file) layer = addFile(layer, result, file, fingerprints.get(source.fileId)); yield event(input.dossierId, source, "completed", { demo: false, layer, queue: input.files.filter((file) => !layer.nodes.some((node) => node.id === `file:${file.id}`)).map((file) => file.id), runStatus: "running" }); continue; }
      if (source.type === "file.connection.discovered") { const connection = source.payload?.connection as FileConnection | undefined; if (connection) layer = addConnection(layer, connection); yield event(input.dossierId, source, "completed", { demo: false, layer, runStatus: "running" }, undefined); continue; }
      const completed = source.type === "mapping.completed"; yield event(input.dossierId, source, completed ? "completed" : "running", { demo: false, layer, queue: input.files.map((file) => file.id), runStatus: completed ? "completed" : "running" });
    }
  }
}
