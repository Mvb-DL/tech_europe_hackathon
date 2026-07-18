"use client";

import { Activity, Info, Inbox, Layers3 } from "lucide-react";
import { LayoutGroup } from "motion/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { EntityMapCanvas } from "@/features/entity-map/entity-map-canvas";
import { FileMapCanvas } from "@/features/file-map/file-map-canvas";
import { FileMapProcessingBuffer } from "@/features/file-map/file-map-processing-buffer";
import {
  formatFileSize,
  getFailedFileIds,
  getFileMapStatus,
  getLatestFileEvent,
  getPlacedFileIds,
  getUploadedFile,
} from "@/features/file-map/file-map-utils";
import { EntityExtractionControls } from "@/features/pipeline/entity-extraction-controls";
import { FileMappingControls } from "@/features/pipeline/file-mapping-controls";
import { SubEntityControls } from "@/features/pipeline/sub-entity-controls";
import { SubEntityMapCanvas } from "@/features/sub-entity-map/sub-entity-map-canvas";
import type { PipelineStage } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";

type WorkspaceStage = Exclude<PipelineStage, "upload">;

const stages: Array<{ label: string; route: string; stage: WorkspaceStage }> = [
  { label: "Files", route: "files", stage: "files" },
  { label: "Entities", route: "entities", stage: "entities" },
  { label: "Sub-entities", route: "sub-entities", stage: "sub_entities" },
  { label: "Profiles", route: "profiles", stage: "profiles" },
  { label: "Enrichment", route: "enrichment", stage: "enrichment" },
];

function getStage(pathname: string): WorkspaceStage {
  return stages.find(({ route }) => pathname.endsWith(`/workspace/${route}`))
    ?.stage ?? "files";
}

type WorkspaceShellProps = {
  children: ReactNode;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const { dossierId } = useParams<{ dossierId: string }>();
  const activeStage = getStage(pathname);
  const workspaceBase = `/dossiers/${encodeURIComponent(dossierId)}/workspace`;
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const events = usePipelineStore((state) => state.events);
  const mapLayers = usePipelineStore((state) => state.mapLayers);
  const processingQueue = usePipelineStore((state) => state.processingQueue);
  const selectedNodeId = usePipelineStore((state) => state.selectedNodeId);
  const setActiveStage = usePipelineStore((state) => state.setActiveStage);
  const setSelectedNodeId = usePipelineStore((state) => state.setSelectedNodeId);

  useEffect(() => {
    setActiveStage(activeStage);
  }, [activeStage, setActiveStage]);

  const fileLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "files"),
    [mapLayers],
  );
  const entityLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "entities"),
    [mapLayers],
  );
  const subEntityLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "sub_entities"),
    [mapLayers],
  );
  const activeLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === activeStage),
    [activeStage, mapLayers],
  );
  const selectedNode = useMemo(
    () => activeLayer?.nodes.find((node) => node.id === selectedNodeId),
    [activeLayer, selectedNodeId],
  );
  const latestFileEvent = useMemo(() => getLatestFileEvent(events), [events]);
  const activeStatus = getFileMapStatus(latestFileEvent);
  const activeFile = getUploadedFile(uploadedFiles, latestFileEvent?.subjectId);
  const placedFileIds = useMemo(() => getPlacedFileIds(fileLayer), [fileLayer]);
  const failedFileIds = useMemo(() => getFailedFileIds(events), [events]);
  const latestEvent = events.at(-1);
  const nodeCount =
    activeStage === "files"
      ? placedFileIds.size
      : activeStage === "entities"
        ? (entityLayer?.nodes.length ?? 0)
        : activeStage === "sub_entities"
          ? (subEntityLayer?.nodes.length ?? 0)
          : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[96rem] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <Layers3 aria-hidden="true" className="text-emerald-700" size={19} />
            <p className="text-sm font-semibold">Cortea</p>
          </div>
          <nav aria-label="Dossier layers" className="min-w-0 overflow-x-auto">
            <ul className="flex min-w-max gap-1">
              {stages.map((stage) => (
                <li key={stage.stage}>
                  <Link
                    aria-current={activeStage === stage.stage ? "page" : undefined}
                    className={`block border px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                      activeStage === stage.stage
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-transparent text-slate-600 hover:border-slate-300"
                    }`}
                    href={`${workspaceBase}/${stage.route}`}
                  >
                    {stage.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <LayoutGroup id="file-map-playback">
        <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-[96rem] grid-cols-1 border-x border-slate-200 bg-white lg:grid-cols-[17rem_minmax(0,1fr)_17rem]">
          <aside className="border-b border-slate-200 bg-slate-50 lg:border-r lg:border-b-0">
            <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-4">
              <Inbox aria-hidden="true" className="text-slate-600" size={16} />
              <h2 className="text-sm font-semibold">Files</h2>
            </div>
            <FileMapProcessingBuffer
              activeFileId={activeFile?.id}
              activeStatus={activeStatus}
              failedFileIds={failedFileIds}
              files={uploadedFiles}
              queue={processingQueue}
            />
            <FileMappingControls isVisible={activeStage === "files"} />
            <EntityExtractionControls isVisible={activeStage === "entities"} />
            <SubEntityControls isVisible={activeStage === "sub_entities"} />
          </aside>

          <section className="flex min-w-0 flex-col bg-slate-100">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-5">
              <h1 className="text-sm font-semibold">
                {stages.find((stage) => stage.stage === activeStage)?.label}
              </h1>
              <p className="text-xs text-slate-600">{nodeCount}</p>
            </div>
            <div className="min-h-[30rem] flex-1 p-4 sm:p-5">
              <div className="h-[min(64vh,42rem)] min-h-[28rem]">
                {activeStage === "entities" ? (
                  <EntityMapCanvas layer={entityLayer} onSelectNode={setSelectedNodeId} />
                ) : activeStage === "sub_entities" ? (
                  <SubEntityMapCanvas
                    layer={subEntityLayer}
                    onSelectNode={setSelectedNodeId}
                  />
                ) : (
                  <FileMapCanvas
                    activeFileId={activeFile?.id}
                    emptyTitle={activeStage === "files" ? "File" : "Map"}
                    layer={activeStage === "files" ? fileLayer : activeLayer}
                    onSelectNode={setSelectedNodeId}
                  />
                )}
              </div>
            </div>
            {latestEvent ? (
              <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 sm:px-5">
                <Activity aria-hidden="true" size={14} />
                <span>{latestEvent.message}</span>
              </div>
            ) : null}
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 lg:border-t-0 lg:border-l">
            <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-4">
              <Info aria-hidden="true" className="text-slate-600" size={16} />
              <h2 className="text-sm font-semibold">Details</h2>
            </div>
            <div className="p-4 text-sm">
              {selectedNode ? (
                <>
                  <p className="font-semibold text-slate-950">{selectedNode.title}</p>
                  <p className="mt-2 text-slate-600">
                    {selectedNode.sourceIds.length} source file
                    {selectedNode.sourceIds.length === 1 ? "" : "s"}
                  </p>
                </>
              ) : activeFile ? (
                <>
                  <p className="truncate font-semibold text-slate-950">
                    {activeFile.filename}
                  </p>
                  <p className="mt-2 text-slate-600">
                    {activeFile.extension.toUpperCase()} · {formatFileSize(activeFile.size)}
                  </p>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      </LayoutGroup>
      {children}
    </div>
  );
}
