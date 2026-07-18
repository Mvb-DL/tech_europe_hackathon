"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PipelineEvent } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";
import { usePipelineRuntime } from "./pipeline-runtime-provider";

type FileMappingControlsProps = {
  isVisible: boolean;
};

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function FileMappingControls({
  isVisible,
}: FileMappingControlsProps) {
  const { fileMappingEngine, graphLayoutEngine } = usePipelineRuntime();
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const dossierId = usePipelineStore((state) => state.dossierId);
  const runStatus = usePipelineStore((state) => state.runStatus);
  const playbackSpeed = usePipelineStore((state) => state.playbackSpeed);
  const applyPipelineEvent = usePipelineStore(
    (state) => state.applyPipelineEvent,
  );
  const resetPipelineRun = usePipelineStore(
    (state) => state.resetPipelineRun,
  );
  const setPlaybackSpeed = usePipelineStore(
    (state) => state.setPlaybackSpeed,
  );
  const setRunStatus = usePipelineStore((state) => state.setRunStatus);
  const upsertMapLayer = usePipelineStore((state) => state.upsertMapLayer);
  const runTokenRef = useRef(0);
  const resumeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      resumeRef.current?.();
      resumeRef.current = null;
    };
  }, []);

  const resumeRun = () => {
    setRunStatus("running");
    resumeRef.current?.();
    resumeRef.current = null;
  };

  const waitWhilePaused = async (runToken: number) => {
    while (
      runToken === runTokenRef.current &&
      usePipelineStore.getState().runStatus === "paused"
    ) {
      await new Promise<void>((resolve) => {
        resumeRef.current = resolve;
      });
    }

    return runToken === runTokenRef.current;
  };

  const runDemo = async () => {
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
          const laidOutLayer = await graphLayoutEngine.layout(
            event.payload.layer,
          );

          if (runToken !== runTokenRef.current) {
            return;
          }

          upsertMapLayer(laidOutLayer);
        }

        if (event.payload?.runStatus === "completed") {
          return;
        }

        const currentSpeed = usePipelineStore.getState().playbackSpeed;
        await delay(Math.round(650 / currentSpeed));
      }
    } catch {
      if (runToken !== runTokenRef.current) {
        return;
      }

      const pendingFileIds = [...usePipelineStore.getState().processingQueue];

      if (pendingFileIds.length === 0) {
        const failureEvent: PipelineEvent = {
          id: `${dossierId}:file_mapping.failed`,
          dossierId,
          stage: "files",
          type: "file_mapping.failed",
          timestamp: new Date().toISOString(),
          status: "failed",
          message: "Demo file mapping could not continue.",
          payload: {
            demo: true,
            queue: [],
            runStatus: "failed",
          },
        };

        applyPipelineEvent(failureEvent);
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
  };

  const restartRun = () => {
    runTokenRef.current += 1;
    resumeRef.current?.();
    resumeRef.current = null;
    void runDemo();
  };

  if (!isVisible) {
    return null;
  }

  const hasFiles = uploadedFiles.length > 0;
  const isPaused = runStatus === "paused";
  const isRunning = runStatus === "running";

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Demo playback
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {isRunning
          ? "Mapping demo is running."
          : isPaused
            ? "Mapping demo is paused."
            : hasFiles
              ? "Ready to map selected files."
              : "Select files before starting the demo."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {isRunning ? (
          <button
            className="inline-flex items-center gap-2 border border-slate-700 bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            onClick={() => setRunStatus("paused")}
            type="button"
          >
            <Pause aria-hidden="true" size={15} />
            Pause
          </button>
        ) : isPaused ? (
          <button
            className="inline-flex items-center gap-2 border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            onClick={resumeRun}
            type="button"
          >
            <Play aria-hidden="true" size={15} />
            Resume
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            disabled={!hasFiles}
            onClick={() => void runDemo()}
            type="button"
          >
            <Play aria-hidden="true" size={15} />
            Start demo
          </button>
        )}
        <button
          className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={!hasFiles}
          onClick={restartRun}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={15} />
          Restart
        </button>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Playback speed
        <select
          className="mt-1 block w-full border border-slate-300 bg-white px-2 py-2 text-sm text-slate-950 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-700"
          onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
          value={playbackSpeed}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </label>
    </div>
  );
}
