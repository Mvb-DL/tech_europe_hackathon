"use client";

import {
  Activity,
  ArrowDownToLine,
  Info,
  Inbox,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { LayoutGroup } from "motion/react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { FileMapCanvas } from "@/features/file-map/file-map-canvas";
import { FileMapProcessingBuffer } from "@/features/file-map/file-map-processing-buffer";
import { EntityMapCanvas } from "@/features/entity-map/entity-map-canvas";
import {
  formatFileSize,
  getFailedFileIds,
  getFileMapStatus,
  getLatestFileEvent,
  getPlacedFileIds,
  getUploadedFile,
} from "@/features/file-map/file-map-utils";
import { FileMappingControls } from "@/features/pipeline/file-mapping-controls";
import { EntityExtractionControls } from "@/features/pipeline/entity-extraction-controls";
import type { PipelineStage } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";

type WorkspaceStage = Exclude<PipelineStage, "upload">;

type StageDefinition = {
  label: string;
  route: string;
  stage: WorkspaceStage;
};

const stages: StageDefinition[] = [
  { label: "Files", route: "files", stage: "files" },
  { label: "Entities", route: "entities", stage: "entities" },
  {
    label: "Sub-entities",
    route: "sub-entities",
    stage: "sub_entities",
  },
  { label: "Profiles", route: "profiles", stage: "profiles" },
  { label: "Enrichment", route: "enrichment", stage: "enrichment" },
];

function getStageFromPathname(pathname: string): WorkspaceStage {
  return (
    stages.find(({ route }) => pathname.endsWith(`/workspace/${route}`))
      ?.stage ?? "files"
  );
}

function gridColumns(isBufferOpen: boolean, isInspectorOpen: boolean) {
  if (isBufferOpen && isInspectorOpen) {
    return "lg:grid-cols-[17rem_minmax(0,1fr)_19rem]";
  }

  if (isBufferOpen) {
    return "lg:grid-cols-[17rem_minmax(0,1fr)_3.5rem]";
  }

  if (isInspectorOpen) {
    return "lg:grid-cols-[3.5rem_minmax(0,1fr)_19rem]";
  }

  return "lg:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]";
}

function runStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function readStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

type WorkspaceShellProps = {
  children: ReactNode;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dossierId } = useParams<{ dossierId: string }>();
  const [isBufferOpen, setIsBufferOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const activeStage = getStageFromPathname(pathname);
  const activeStageDefinition =
    stages.find(({ stage }) => stage === activeStage) ?? stages[0];
  const previousStageDefinition =
    stages[stages.findIndex(({ stage }) => stage === activeStage) - 1];
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const events = usePipelineStore((state) => state.events);
  const mapLayers = usePipelineStore((state) => state.mapLayers);
  const processingQueue = usePipelineStore((state) => state.processingQueue);
  const runStatus = usePipelineStore((state) => state.runStatus);
  const selectedNodeId = usePipelineStore((state) => state.selectedNodeId);
  const setActiveStage = usePipelineStore((state) => state.setActiveStage);
  const setSelectedNodeId = usePipelineStore(
    (state) => state.setSelectedNodeId,
  );

  useEffect(() => {
    setActiveStage(activeStage);
  }, [activeStage, setActiveStage]);

  const activeLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === activeStage),
    [activeStage, mapLayers],
  );
  const fileLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "files"),
    [mapLayers],
  );
  const entityLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "entities"),
    [mapLayers],
  );
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return undefined;
    }

    return mapLayers
      .flatMap((layer) => layer.nodes)
      .find((node) => node.id === selectedNodeId);
  }, [mapLayers, selectedNodeId]);
  const latestFileEvent = useMemo(() => getLatestFileEvent(events), [events]);
  const activeStatus = getFileMapStatus(latestFileEvent);
  const activeFile = getUploadedFile(uploadedFiles, latestFileEvent?.subjectId);
  const placedFileIds = useMemo(() => getPlacedFileIds(fileLayer), [fileLayer]);
  const failedFileIds = useMemo(() => getFailedFileIds(events), [events]);
  const recentEvents = events.slice(-4).reverse();
  const workspaceBase = `/dossiers/${encodeURIComponent(dossierId)}/workspace`;
  const mappedFileCount = placedFileIds.size;
  const mappedNodeCount =
    activeStage === "files"
      ? mappedFileCount
      : activeStage === "entities"
        ? (entityLayer?.nodes.length ?? 0)
        : 0;
  const selectedEntitySourceGroupIds = readStringArray(
    selectedNode?.data.sourceGroupIds,
  );
  const selectedEntitySourceGroupTitles = readStringArray(
    selectedNode?.data.sourceGroupTitles,
  );
  const selectedEntityCreationEventId =
    typeof selectedNode?.data.creationEventId === "string"
      ? selectedNode.data.creationEventId
      : undefined;

  const traceToFiles = () => {
    setSelectedNodeId(selectedEntitySourceGroupIds[0] ?? null);
    router.push(`${workspaceBase}/files`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[96rem] items-center gap-5 px-4 py-3 sm:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <Layers3 aria-hidden="true" className="text-emerald-700" size={20} />
            <div>
              <p className="text-sm font-semibold text-slate-950">Cortea</p>
              <p className="text-xs text-slate-600">Layered dossier map</p>
            </div>
          </div>
          <nav
            aria-label="Dossier layers"
            className="min-w-0 overflow-x-auto"
          >
            <ul className="flex min-w-max items-center gap-1">
              {stages.map((stage, index) => {
                const isActive = stage.stage === activeStage;

                return (
                  <li key={stage.stage}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-2 border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none ${
                        isActive
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      href={`${workspaceBase}/${stage.route}`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center border text-xs ${
                          isActive
                            ? "border-emerald-200 text-white"
                            : "border-slate-300 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {stage.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <LayoutGroup id="file-map-playback">
        <div
          className={`mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-[96rem] grid-cols-1 border-x border-slate-200 bg-white ${gridColumns(
            isBufferOpen,
            isInspectorOpen,
          )}`}
        >
          <aside className="border-b border-slate-200 bg-slate-50 lg:border-r lg:border-b-0">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              {isBufferOpen ? (
                <div className="flex items-center gap-2">
                  <Inbox aria-hidden="true" className="text-slate-600" size={17} />
                  <h2 className="text-sm font-semibold">Processing buffer</h2>
                </div>
              ) : (
                <Inbox aria-hidden="true" className="text-slate-600" size={17} />
              )}
              <button
                aria-label={
                  isBufferOpen
                    ? "Collapse processing buffer"
                    : "Expand processing buffer"
                }
                className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                onClick={() => setIsBufferOpen((isOpen) => !isOpen)}
                title={
                  isBufferOpen
                    ? "Collapse processing buffer"
                    : "Expand processing buffer"
                }
                type="button"
              >
                {isBufferOpen ? (
                  <PanelLeftClose aria-hidden="true" size={17} />
                ) : (
                  <PanelLeftOpen aria-hidden="true" size={17} />
                )}
              </button>
            </div>
            {isBufferOpen ? (
              <FileMapProcessingBuffer
                activeFileId={activeFile?.id}
                activeStatus={activeStatus}
                failedFileIds={failedFileIds}
                files={uploadedFiles}
                placedFileIds={placedFileIds}
                queue={processingQueue}
              />
            ) : null}
            <FileMappingControls
              isVisible={isBufferOpen && activeStage === "files"}
            />
            <EntityExtractionControls
              isVisible={isBufferOpen && activeStage === "entities"}
            />
          </aside>

          <section className="flex min-w-0 flex-col bg-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Active layer
                </p>
                <h1 className="mt-1 text-lg font-semibold">
                  {activeStageDefinition.label}
                </h1>
              </div>
              <p className="text-sm text-slate-600">
                {activeStage === "files" || activeStage === "entities"
                  ? `${mappedNodeCount} mapped`
                  : "Empty map"}
              </p>
            </div>

            <div className="min-h-[30rem] flex-1 p-4 sm:p-5">
              <div className="relative h-[min(60vh,42rem)] min-h-[28rem]">
                {previousStageDefinition ? (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-5 inset-y-4 translate-y-3 border border-slate-300 bg-slate-200/60"
                  >
                    <span className="absolute left-3 top-3 text-xs font-medium text-slate-500">
                      {previousStageDefinition.label} layer
                    </span>
                  </div>
                ) : null}
                <div className="relative z-10 h-full">
                  {activeStage === "entities" ? (
                    <EntityMapCanvas
                      layer={entityLayer}
                      onSelectNode={setSelectedNodeId}
                    />
                  ) : (
                    <FileMapCanvas
                      activeFileId={activeFile?.id}
                      emptyTitle={activeStageDefinition.label}
                      layer={activeStage === "files" ? fileLayer : activeLayer}
                      onSelectNode={setSelectedNodeId}
                    />
                  )}
                </div>
              </div>
            </div>

            <section
              aria-label="Activity stream"
              className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity aria-hidden="true" className="text-slate-600" size={17} />
                  <h2 className="text-sm font-semibold">Activity</h2>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {runStatusLabel(runStatus)}
                </span>
              </div>
              {recentEvents.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {recentEvents.map((event) => (
                    <li
                      className="flex items-start gap-2 text-sm text-slate-700"
                      key={event.id}
                    >
                      <span className="mt-0.5 shrink-0 border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Demo
                      </span>
                      <span>{event.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  No activity has been recorded for this dossier.
                </p>
              )}
            </section>
          </section>

          <aside className="border-t border-slate-200 bg-slate-50 lg:border-t-0 lg:border-l">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              {isInspectorOpen ? (
                <div className="flex items-center gap-2">
                  <Info aria-hidden="true" className="text-slate-600" size={17} />
                  <h2 className="text-sm font-semibold">Inspector</h2>
                </div>
              ) : (
                <Info aria-hidden="true" className="text-slate-600" size={17} />
              )}
              <button
                aria-label={
                  isInspectorOpen ? "Collapse inspector" : "Expand inspector"
                }
                className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-slate-200 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                onClick={() => setIsInspectorOpen((isOpen) => !isOpen)}
                title={
                  isInspectorOpen ? "Collapse inspector" : "Expand inspector"
                }
                type="button"
              >
                {isInspectorOpen ? (
                  <PanelRightClose aria-hidden="true" size={17} />
                ) : (
                  <PanelRightOpen aria-hidden="true" size={17} />
                )}
              </button>
            </div>
            {isInspectorOpen ? (
              <div className="p-4">
                {selectedNode ? (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      {selectedNode.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {selectedNode.subtitle ??
                        "Demo-derived map group based on uploaded file metadata."}
                    </p>
                    <dl className="mt-5 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </dt>
                        <dd className="mt-1 text-slate-800">{selectedNode.status}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Source coverage
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {selectedNode.sourceIds.length} uploaded file
                          {selectedNode.sourceIds.length === 1 ? "" : "s"}
                        </dd>
                      </div>
                      {selectedNode.kind === "entity" ? (
                        <>
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Relationship status
                            </dt>
                            <dd className="mt-1 text-slate-800">Candidate</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Source groups
                            </dt>
                            <dd className="mt-1 text-slate-800">
                              {selectedEntitySourceGroupTitles.join(", ") ||
                                "No source group recorded"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Creation event
                            </dt>
                            <dd className="mt-1 break-all text-slate-800">
                              {selectedEntityCreationEventId ?? "Not recorded"}
                            </dd>
                          </div>
                        </>
                      ) : null}
                    </dl>
                    {selectedNode.kind === "entity" ? (
                      <button
                        className="mt-5 inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        disabled={selectedEntitySourceGroupIds.length === 0}
                        onClick={traceToFiles}
                        type="button"
                      >
                        <ArrowDownToLine aria-hidden="true" size={15} />
                        Trace to files
                      </button>
                    ) : null}
                  </>
                ) : activeFile ? (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      {activeFile.filename}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The demo is currently tracking this uploaded file.
                    </p>
                    <dl className="mt-5 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Type
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {activeFile.extension.toUpperCase()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Size
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {formatFileSize(activeFile.size)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Current action
                        </dt>
                        <dd className="mt-1 text-slate-800">
                          {activeStatus}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      No selection
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Select a map group or file to inspect its source coverage.
                    </p>
                  </>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </LayoutGroup>

      <div aria-live="polite" className="sr-only">
        {activeStageDefinition.label} workspace
      </div>
      {children}
    </div>
  );
}
