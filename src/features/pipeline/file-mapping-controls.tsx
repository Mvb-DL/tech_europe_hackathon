"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { PipelineEvent } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";
import { usePipelineRuntime } from "./pipeline-runtime-provider";

type FileMappingControlsProps = {
  isVisible: boolean;
};

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export function FileMappingControls({ isVisible }: FileMappingControlsProps) {
  const { fileMappingEngine, graphLayoutEngine } = usePipelineRuntime();
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const dossierId = usePipelineStore((state) => state.dossierId);
  const runStatus = usePipelineStore((state) => state.runStatus);
  const applyPipelineEvent = usePipelineStore((state) => state.applyPipelineEvent);
  const resetPipelineRun = usePipelineStore((state) => state.resetPipelineRun);
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
    resetPipelineRun();
    setRunStatus("running");

    try {
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
    resetPipelineRun,
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
      !autoRunKey ||
      uploadedFiles.length === 0 ||
      runStatus !== "idle" ||
      autoStartedRunRef.current === autoRunKey
    ) {
      return;
    }

    autoStartedRunRef.current = autoRunKey;
    void runDemo();
  }, [autoRunKey, isVisible, runDemo, runStatus, uploadedFiles.length]);

  if (!isVisible || runStatus !== "failed") {
    return null;
  }

  return (
    <div className="border-t border-slate-200 p-4">
      <button
        aria-label="Retry file mapping"
        className="grid h-8 w-8 place-items-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        onClick={() => void runDemo()}
        title="Retry file mapping"
        type="button"
      >
        <RotateCcw aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
