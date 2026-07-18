"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { PipelineEvent } from "@/lib/pipeline/contracts";
import type { MapLayer, MapNode, UploadedFile } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";
import { usePipelineRuntime } from "./pipeline-runtime-provider";

type FileMappingControlsProps = {
  autoRun?: boolean;
  isVisible: boolean;
};

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function createQueuedFileLayer(dossierId: string, files: UploadedFile[]): MapLayer {
  const layerId = `layer:files:${dossierId}`;
  const groupId = "file-group:agent-intake";
  const group: MapNode = {
    id: groupId,
    layerId,
    kind: "file_group",
    title: "Agent sorting queue",
    status: "processing",
    sourceIds: files.map((file) => file.id),
    data: {
      domain: "agent_queue",
      fileCount: files.length,
      groupReason: "Uploaded files waiting for agent classification.",
    },
  };

  return {
    id: layerId,
    stage: "files",
    title: "File Map",
    createdAt: new Date().toISOString(),
    nodes: [
      group,
      ...files.map<MapNode>((file) => ({
        id: `file:${file.id}`,
        layerId,
        kind: "file",
        title: file.filename,
        subtitle: `${file.extension.toUpperCase()} · queued`,
        status: "queued",
        parentId: groupId,
        sourceIds: [file.id],
        data: {},
      })),
    ],
    edges: files.map((file) => ({
      id: `edge:${groupId}:file:${file.id}`,
      layerId,
      source: groupId,
      target: `file:${file.id}`,
      relation: "queued_for_mapping",
      status: "candidate",
      sourceIds: [file.id],
    })),
  };
}

export function FileMappingControls({ autoRun = false, isVisible }: FileMappingControlsProps) {
  const { fileMappingEngine, graphLayoutEngine } = usePipelineRuntime();
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const dossierId = usePipelineStore((state) => state.dossierId);
  const runStatus = usePipelineStore((state) => state.runStatus);
  const applyPipelineEvent = usePipelineStore((state) => state.applyPipelineEvent);
  const resetStageRun = usePipelineStore((state) => state.resetStageRun);
  const setProcessingQueue = usePipelineStore((state) => state.setProcessingQueue);
  const setRunStatus = usePipelineStore((state) => state.setRunStatus);
  const upsertMapLayer = usePipelineStore((state) => state.upsertMapLayer);
  const runTokenRef = useRef(0);
  const resumeRef = useRef<(() => void) | null>(null);
  const autoStartedRunRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      resumeRef.current?.();
      resumeRef.current = null;
    };
  }, []);

  const waitWhilePaused = useCallback(async (runToken: number) => {
    while (
      runToken === runTokenRef.current &&
      usePipelineStore.getState().runStatus === "paused"
    ) {
      await new Promise<void>((resolve) => {
        resumeRef.current = resolve;
      });
    }

    return runToken === runTokenRef.current;
  }, []);

  const runDemo = useCallback(async () => {
    if (!dossierId || uploadedFiles.length === 0) {
      return;
    }

    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;
    resetStageRun("files");
    setProcessingQueue(uploadedFiles.map((file) => file.id));
    setRunStatus("running");

    try {
      const queuedLayer = await graphLayoutEngine.layout(
        createQueuedFileLayer(dossierId, uploadedFiles),
      );
      upsertMapLayer(queuedLayer);
      applyPipelineEvent({
        id: `${dossierId}:file_mapping.client_queued`,
        dossierId,
        stage: "files",
        type: "file_mapping_started",
        timestamp: new Date().toISOString(),
        status: "running",
        message: `File mapping agent started with ${uploadedFiles.length} files.`,
        subjectId: uploadedFiles[0]?.id,
        payload: {
          demo: false,
          layer: queuedLayer,
          queue: uploadedFiles.map((file) => file.id),
          runStatus: "running",
        },
      });

      for await (const event of fileMappingEngine.run({
        dossierId,
        files: uploadedFiles,
      })) {
        if (!(await waitWhilePaused(runToken))) {
          return;
        }

        applyPipelineEvent(event);

        if (event.payload?.layer) {
          const laidOutLayer = await graphLayoutEngine.layout(event.payload.layer);

          if (runToken !== runTokenRef.current) {
            return;
          }

          upsertMapLayer(laidOutLayer);
        }

        if (event.payload?.runStatus === "completed") {
          return;
        }

        await delay(Math.round(650 / usePipelineStore.getState().playbackSpeed));
      }
    } catch {
      if (runToken !== runTokenRef.current) {
        return;
      }

      const pendingFileIds = [...usePipelineStore.getState().processingQueue];

      if (pendingFileIds.length === 0) {
        applyPipelineEvent({
          id: `${dossierId}:file_mapping.failed`,
          dossierId,
          stage: "files",
          type: "file_mapping.failed",
          timestamp: new Date().toISOString(),
          status: "failed",
          message: "Demo file mapping could not continue.",
          payload: { demo: true, queue: [], runStatus: "failed" },
        });
        return;
      }

      pendingFileIds.forEach((fileId, index) => {
        const failureEvent: PipelineEvent = {
          id: `${dossierId}:file_mapping.file_failed:${index}`,
          dossierId,
          stage: "files",
          type: "file_mapping.file_failed",
          timestamp: new Date().toISOString(),
          status: "failed",
          message: `Demo could not place the remaining file ${fileId}.`,
          subjectId: fileId,
          payload: {
            demo: true,
            queue: pendingFileIds.slice(index + 1),
            runStatus: "failed",
          },
        };

        applyPipelineEvent(failureEvent);
      });
    }
  }, [
    applyPipelineEvent,
    dossierId,
    fileMappingEngine,
    graphLayoutEngine,
    resetStageRun,
    setProcessingQueue,
    setRunStatus,
    uploadedFiles,
    upsertMapLayer,
    waitWhilePaused,
  ]);

  const autoRunKey = dossierId
    ? `${dossierId}:${uploadedFiles.map((file) => file.id).join(",")}`
    : null;

  useEffect(() => {
    if (
      !isVisible ||
      !autoRun ||
      !autoRunKey ||
      uploadedFiles.length === 0 ||
      autoStartedRunRef.current === autoRunKey
    ) {
      return;
    }

    autoStartedRunRef.current = autoRunKey;
    void runDemo();
  }, [autoRun, autoRunKey, isVisible, runDemo, runStatus, uploadedFiles.length]);

  if (!isVisible || runStatus !== "failed") {
    return null;
  }

  return (
    <div className="border-t border-[#E6E7EC] p-4">
      <button
        aria-label="Retry file mapping"
        className="grid h-8 w-8 place-items-center rounded-md border border-[#E6E7EC] bg-white text-[#5A6379] hover:bg-[#F2F3F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
        onClick={() => void runDemo()}
        title="Retry file mapping"
        type="button"
      >
        <RotateCcw aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
