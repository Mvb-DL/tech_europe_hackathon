"use client";

import { Activity, Check, Circle, FileStack, Info, Layers3 } from "lucide-react";
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
import { ProfileControls } from "@/features/pipeline/profile-controls";
import { SubEntityControls } from "@/features/pipeline/sub-entity-controls";
import { ProfileMapCanvas } from "@/features/profile-map/profile-map-canvas";
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

const navStages: Array<{
  label: string;
  route: string;
  stage: PipelineStage;
}> = [
  { label: "Upload", route: "/", stage: "upload" },
  ...stages,
];

function getStage(pathname: string): WorkspaceStage {
  return stages.find(({ route }) => pathname.endsWith(`/workspace/${route}`))
    ?.stage ?? "files";
}

type WorkspaceShellProps = {
  children: ReactNode;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

type ProfileMetric = {
  label: string;
  provenance: "observed" | "derived" | "inferred";
  sourceLabel: string;
  value: string;
};

type ProfileLineageItem = {
  id: string;
  sourceCount: number;
  title: string;
};

function readProfileMetrics(value: unknown): ProfileMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((metric): metric is ProfileMetric => {
    const metricRecord = record(metric);

    return Boolean(
      metricRecord &&
        typeof metricRecord.label === "string" &&
        typeof metricRecord.value === "string" &&
        typeof metricRecord.sourceLabel === "string" &&
        (metricRecord.provenance === "observed" ||
          metricRecord.provenance === "derived" ||
          metricRecord.provenance === "inferred"),
    );
  });
}

function readProfileLineage(value: unknown): ProfileLineageItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is ProfileLineageItem => {
    const itemRecord = record(item);

    return Boolean(
      itemRecord &&
        typeof itemRecord.id === "string" &&
        typeof itemRecord.title === "string" &&
        typeof itemRecord.sourceCount === "number",
    );
  });
}

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function labelFromKey(key: string) {
  return key
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
}

function formatInspectorValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const primitives = value.filter(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    );

    if (primitives.length === value.length) {
      return primitives.join(", ");
    }
  }

  return JSON.stringify(value);
}

function readInspectorData(data: Record<string, unknown> | undefined) {
  if (!data) {
    return [];
  }

  const hiddenKeys = new Set([
    "layout",
    "result",
    "metrics",
    "lineage",
    "dataGaps",
    "sourceCoverage",
  ]);

  return Object.entries(data)
    .filter(([key, value]) => !hiddenKeys.has(key) && value !== undefined && value !== null)
    .map(([key, value]) => ({
      label: labelFromKey(key),
      value: formatInspectorValue(value),
    }))
    .filter((entry) => entry.value && entry.value !== "[]")
    .slice(0, 8);
}

function profileTagClass(provenance: ProfileMetric["provenance"]) {
  switch (provenance) {
    case "observed":
      return "border-[#3D9E8E]/30 bg-[#E5F4F1] text-[#247567]";
    case "derived":
      return "border-[#2F63E6]/25 bg-[#EDF1FC] text-[#2F63E6]";
    case "inferred":
      return "border-dashed border-[#B4780F]/40 bg-[#FBF2DE] text-[#8A5A08]";
  }
}

function stageIndex(stage: PipelineStage) {
  return navStages.findIndex((item) => item.stage === stage);
}

function layerTitle(stage: WorkspaceStage) {
  return stages.find((item) => item.stage === stage)?.label ?? "Files";
}

function stageSubtitle(stage: WorkspaceStage, nodeCount: number) {
  switch (stage) {
    case "files":
      return nodeCount > 0 ? `${nodeCount} files placed into category groups` : "Uploaded files will resolve into category groups.";
    case "entities":
      return "Business entity types extracted from mapped file groups.";
    case "sub_entities":
      return "Selected entities broken into traceable component facets.";
    case "profiles":
      return "Sub-entities consolidated into source-covered business profiles.";
    case "enrichment":
      return "Profiles augmented with internal evidence and optional external modules.";
  }
}

function stageBadge(stage: WorkspaceStage, runStatus: string) {
  if (runStatus === "running") {
    return "Processing";
  }

  if (stage === "files") {
    return "Mapped";
  }

  return "Available";
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const { dossierId } = useParams<{ dossierId: string }>();
  const activeStage = getStage(pathname);
  const workspaceBase = `/dossiers/${encodeURIComponent(dossierId)}/workspace`;
  const uploadedFiles = usePipelineStore((state) => state.uploadedFiles);
  const events = usePipelineStore((state) => state.events);
  const mapLayers = usePipelineStore((state) => state.mapLayers);
  const processingQueue = usePipelineStore((state) => state.processingQueue);
  const runStatus = usePipelineStore((state) => state.runStatus);
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
  const profileLayer = useMemo(
    () => mapLayers.find((layer) => layer.stage === "profiles"),
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
  const selectedResult = record(selectedNode?.data.result);
  const selectedReasons = Array.isArray(selectedResult?.reasons)
    ? selectedResult.reasons.map(record).filter((reason): reason is Record<string, unknown> => Boolean(reason)).slice(0, 3)
    : [];
  const selectedWarnings = Array.isArray(selectedResult?.warnings)
    ? selectedResult.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  const selectedInspectorData = readInspectorData(selectedNode?.data);
  const nodeCount =
    activeStage === "files"
      ? placedFileIds.size
      : activeStage === "entities"
        ? (entityLayer?.nodes.length ?? 0)
        : activeStage === "sub_entities"
          ? (subEntityLayer?.nodes.length ?? 0)
          : activeStage === "profiles"
            ? (profileLayer?.nodes.length ?? 0)
          : 0;
  const selectedProfileMetrics = readProfileMetrics(selectedNode?.data.metrics);
  const selectedProfileLineage = readProfileLineage(selectedNode?.data.lineage);
  const selectedProfileGaps = readStringList(selectedNode?.data.dataGaps);
  const selectedProfileCoverage =
    typeof selectedNode?.data.sourceCoverage === "number"
      ? selectedNode.data.sourceCoverage
      : undefined;
  const currentStageIndex = stageIndex(activeStage);
  const activeBadge = stageBadge(activeStage, runStatus);
  const activityRows = events.slice(-5).reverse();
  const underlyingStages = stages.filter(
    (stage) => stageIndex(stage.stage) < currentStageIndex,
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#1A2340]">
      <LayoutGroup id="file-map-playback">
        <div className="mx-auto grid min-h-[1024px] max-w-[1440px] grid-rows-[58px_minmax(0,1fr)_142px] overflow-hidden border-x border-[#E6E7EC] bg-[#F7F6F2] shadow-[0_24px_70px_rgba(26,35,64,0.08)]">
          <header className="grid grid-cols-[252px_minmax(0,1fr)] items-center border-b border-[#E6E7EC] bg-white px-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-[#2F63E6]/20 bg-[#EDF1FC] text-[#2F63E6]">
                <Layers3 aria-hidden="true" size={18} />
              </div>
              <div>
                <p className="text-[15px] font-bold leading-5 tracking-[0]">Proofline</p>
                <p className="text-[11px] font-medium text-[#5A6379]">Audit Investigation Workspace</p>
              </div>
            </div>

            <nav aria-label="Dossier layers" className="min-w-0 px-5">
              <ol className="flex items-center justify-center">
                {navStages.map((stage, index) => {
                  const isActive = stage.stage === activeStage;
                  const isComplete = index < currentStageIndex;
                  const href =
                    stage.stage === "upload"
                      ? "/"
                      : `${workspaceBase}/${stage.route}`;

                  return (
                    <li className="flex min-w-0 items-center" key={stage.stage}>
                      {index > 0 ? (
                        <span
                          aria-hidden="true"
                          className={`h-px w-7 ${isComplete ? "bg-[#3D9E8E]" : isActive ? "bg-[#2F63E6]" : "bg-[#E6E7EC]"}`}
                        />
                      ) : null}
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={`group flex h-9 min-w-[88px] items-center gap-2 rounded-md border px-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6] ${
                          isActive
                            ? "border-[#2F63E6]/20 bg-[#EDF1FC]"
                            : "border-transparent bg-white hover:border-[#E6E7EC]"
                        }`}
                        href={href}
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
                            isComplete
                              ? "border-[#3D9E8E] bg-[#3D9E8E] text-white"
                              : isActive
                                ? "border-[#2F63E6] bg-[#2F63E6] text-white"
                                : "border-[#E6E7EC] bg-white text-[#5A6379]"
                          }`}
                        >
                          {isComplete ? <Check aria-hidden="true" size={12} /> : index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate text-[11px] font-semibold ${isActive ? "text-[#2F63E6]" : "text-[#1A2340]"}`}>
                            {stage.label}
                          </span>
                          <span className="block truncate text-[9px] font-medium text-[#98A0B0]">
                            {isComplete ? "Complete" : isActive ? "Viewing" : "Available"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>

          </header>

          <div className="grid min-h-0 grid-cols-[264px_minmax(0,1fr)_334px]">
            <aside className="min-h-0 overflow-y-auto border-r border-[#E6E7EC] bg-white">
              {activeStage === "files" ? (
                <div>
                  <div className="flex h-12 items-center gap-2 border-b border-[#E6E7EC] px-4">
                    <FileStack aria-hidden="true" className="text-[#2F63E6]" size={16} />
                    <div>
                      <h2 className="text-sm font-semibold">Files for mapping</h2>
                      <p className="text-[11px] text-[#5A6379]">Agent queue · grouped on the map</p>
                    </div>
                  </div>
                  <FileMapProcessingBuffer
                    activeFileId={activeFile?.id}
                    activeStatus={activeStatus}
                    failedFileIds={failedFileIds}
                    files={uploadedFiles}
                    queue={processingQueue}
                  />
                </div>
              ) : (
                <div className="px-4 py-4">
                  <p className="text-sm font-semibold text-[#1A2340]">{layerTitle(activeStage)} layer</p>
                  <p className="mt-1 text-xs leading-5 text-[#5A6379]">{stageSubtitle(activeStage, nodeCount)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-[#E6E7EC] bg-[#F7F6F2] p-3">
                      <p className="text-lg font-bold">{nodeCount}</p>
                      <p className="text-[11px] text-[#5A6379]">visible nodes</p>
                    </div>
                    <div className="rounded-md border border-[#E6E7EC] bg-[#F7F6F2] p-3">
                      <p className="text-lg font-bold">{selectedNode ? "1" : "0"}</p>
                      <p className="text-[11px] text-[#5A6379]">selected</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0] text-[#5A6379]">Legend</p>
                    <div className="flex items-center gap-2 text-xs text-[#5A6379]"><span className="h-2.5 w-2.5 rounded-full bg-[#2F63E6]" /> Active / derived</div>
                    <div className="flex items-center gap-2 text-xs text-[#5A6379]"><span className="h-2.5 w-2.5 rounded-full bg-[#3D9E8E]" /> Observed / complete</div>
                    <div className="flex items-center gap-2 text-xs text-[#5A6379]"><span className="h-2.5 w-2.5 rounded-full bg-[#B4780F]" /> Inferred / review</div>
                  </div>
                </div>
              )}

              <div className="px-4 pb-4">
                <FileMappingControls isVisible={activeStage === "files"} />
                <EntityExtractionControls isVisible={activeStage === "entities"} />
                <SubEntityControls isVisible={activeStage === "sub_entities"} />
                <ProfileControls isVisible={activeStage === "profiles"} />
              </div>
            </aside>

            <section className="flex min-w-0 flex-col bg-[#F7F6F2]">
              <div className="flex h-[62px] items-center justify-between border-b border-[#E6E7EC] bg-white px-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[17px] font-bold tracking-[0]">{layerTitle(activeStage)}</h1>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0] ${runStatus === "running" ? "bg-[#EDF1FC] text-[#2F63E6]" : activeBadge === "Mapped" ? "bg-[#E5F4F1] text-[#247567]" : "bg-[#F2F3F6] text-[#5A6379]"}`}>
                      {activeBadge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5A6379]">{stageSubtitle(activeStage, nodeCount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#98A0B0]">Underlying:</span>
                  {underlyingStages.length > 0 ? (
                    underlyingStages.map((stage) => (
                      <Link
                        className="rounded-full border border-[#E6E7EC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2F63E6] hover:bg-[#EDF1FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
                        href={`${workspaceBase}/${stage.route}`}
                        key={stage.stage}
                      >
                        {stage.label}
                      </Link>
                    ))
                  ) : (
                    <span className="rounded-full border border-dashed border-[#E6E7EC] px-2.5 py-1 text-[11px] font-semibold text-[#98A0B0]">None</span>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 p-5">
                <div className="h-full min-h-[620px] rounded-lg border border-[#E6E7EC] bg-white p-2 shadow-[0_18px_40px_rgba(26,35,64,0.06)]">
                  {activeStage === "entities" ? (
                    <EntityMapCanvas layer={entityLayer} onSelectNode={setSelectedNodeId} />
                  ) : activeStage === "sub_entities" ? (
                    <SubEntityMapCanvas
                      layer={subEntityLayer}
                      onSelectNode={setSelectedNodeId}
                    />
                  ) : activeStage === "profiles" ? (
                    <ProfileMapCanvas
                      layer={profileLayer}
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
            </section>

            <aside className="min-h-0 overflow-y-auto border-l border-[#E6E7EC] bg-white">
              <div className="flex h-[62px] items-center gap-2 border-b border-[#E6E7EC] px-4">
                <Info aria-hidden="true" className="text-[#2F63E6]" size={16} />
                <div>
                  <h2 className="text-sm font-bold">Audit Inspector</h2>
                  <p className="text-[11px] text-[#5A6379]">Hover or click evidence</p>
                </div>
              </div>
              <div className="p-4 text-sm">
              {selectedNode ? (
                <>
                  <p className="text-base font-bold leading-6 text-[#1A2340]">{selectedNode.title}</p>
                  {selectedNode.subtitle ? (
                    <p className="mt-1 text-xs font-medium text-[#5A6379]">{selectedNode.subtitle}</p>
                  ) : null}
                  <p className="mt-3 inline-flex rounded-full border border-[#E6E7EC] bg-[#F7F6F2] px-2.5 py-1 text-[11px] font-semibold text-[#5A6379]">
                    {selectedNode.sourceIds.length} source file
                    {selectedNode.sourceIds.length === 1 ? "" : "s"}
                  </p>
                  {selectedNode.sourceIds.length > 0 ? (
                    <div className="mt-4 rounded-md border border-[#E6E7EC] bg-white px-3 py-2 text-xs">
                      <p className="font-bold text-[#1A2340]">Evidence sources</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedNode.sourceIds.slice(0, 8).map((sourceId) => (
                          <span
                            className="max-w-full truncate rounded-full border border-[#E6E7EC] bg-[#F7F6F2] px-2 py-0.5 text-[10px] font-semibold text-[#5A6379]"
                            key={sourceId}
                            title={sourceId}
                          >
                            {sourceId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {selectedInspectorData.length > 0 ? (
                    <dl className="mt-3 space-y-2 text-xs text-[#5A6379]">
                      {selectedInspectorData.map((entry) => (
                        <div
                          className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"
                          key={entry.label}
                        >
                          <dt className="font-bold text-[#1A2340]">{entry.label}</dt>
                          <dd className="mt-1 line-clamp-4 break-words">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {selectedNode.kind === "profile" ? (
                    <div className="mt-5 space-y-5 text-xs text-[#5A6379]">
                      {selectedProfileCoverage !== undefined ? (
                        <div>
                          <div className="flex items-center justify-between font-semibold text-[#1A2340]">
                            <span>Source coverage</span>
                            <span>{selectedProfileCoverage}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-[#F2F3F6]">
                            <div
                              className={`h-full rounded-full ${selectedProfileCoverage >= 95 ? "bg-[#3D9E8E]" : "bg-[#B4780F]"}`}
                              style={{ width: `${selectedProfileCoverage}%` }}
                            />
                          </div>
                        </div>
                      ) : null}
                      {selectedProfileMetrics.length > 0 ? (
                        <div>
                          <p className="font-bold text-[#1A2340]">Profile metrics</p>
                          <dl className="mt-2 space-y-2">
                            {selectedProfileMetrics.map((metric) => (
                              <div
                                className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"
                                key={`${metric.label}:${metric.value}`}
                              >
                                <dt className="font-semibold text-[#5A6379]">{metric.label}</dt>
                                <dd className="mt-1 flex items-center justify-between gap-2">
                                  <span className="font-bold text-[#1A2340]">{metric.value}</span>
                                  <span
                                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${profileTagClass(metric.provenance)}`}
                                  >
                                    {metric.provenance}
                                  </span>
                                </dd>
                                <dd className="mt-1 text-[11px] text-[#98A0B0]">
                                  Source: {metric.sourceLabel}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                      {selectedProfileGaps.length > 0 ? (
                        <div>
                          <p className="font-bold text-[#1A2340]">Data gaps</p>
                          <ul className="mt-2 space-y-1">
                            {selectedProfileGaps.map((gap) => (
                              <li className="rounded-md border border-dashed border-[#B4780F]/40 bg-[#FBF2DE] px-3 py-2 text-[#8A5A08]" key={gap}>
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="rounded-md border border-[#3D9E8E]/25 bg-[#E5F4F1] px-3 py-2 font-semibold text-[#247567]">
                          No open data gaps
                        </div>
                      )}
                      {selectedProfileLineage.length > 0 ? (
                        <div>
                          <p className="font-bold text-[#1A2340]">Contributing sub-entities</p>
                          <div className="mt-2 space-y-2">
                            {selectedProfileLineage.map((item) => (
                              <Link
                                className="block rounded-md border border-[#E6E7EC] bg-white px-3 py-2 hover:border-[#2F63E6] hover:bg-[#EDF1FC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
                                href={`${workspaceBase}/sub-entities`}
                                key={item.id}
                                onClick={() => setSelectedNodeId(item.id)}
                              >
                                <span className="font-semibold text-[#1A2340]">{item.title}</span>
                                <span className="mt-1 block text-[11px] text-[#5A6379]">
                                  Trace down · {item.sourceCount} source file
                                  {item.sourceCount === 1 ? "" : "s"}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : selectedResult ? (
                    <dl className="mt-5 space-y-2 text-xs text-[#5A6379]">
                      <div className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"><dt className="font-bold text-[#1A2340]">Domain</dt><dd>{String(selectedResult.primaryDomain ?? "unknown")}</dd></div>
                      <div className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"><dt className="font-bold text-[#1A2340]">Role</dt><dd>{String(selectedResult.documentRole ?? "unknown")}</dd></div>
                      <div className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"><dt className="font-bold text-[#1A2340]">Method</dt><dd>{String(selectedResult.method ?? "unknown")} · {typeof selectedResult.confidence === "number" ? `${Math.round(selectedResult.confidence * 100)}%` : ""}</dd></div>
                      {selectedReasons.length > 0 ? <div className="rounded-md border border-[#E6E7EC] bg-white px-3 py-2"><dt className="font-bold text-[#1A2340]">Signals</dt>{selectedReasons.map((reason) => <dd key={String(reason.signal)}>{String(reason.signal)}</dd>)}</div> : null}
                      {selectedWarnings.length > 0 ? <div className="rounded-md border border-dashed border-[#B4780F]/40 bg-[#FBF2DE] px-3 py-2"><dt className="font-bold text-[#8A5A08]">Warnings</dt>{selectedWarnings.map((warning) => <dd key={warning}>{warning}</dd>)}</div> : null}
                    </dl>
                  ) : null}
                </>
              ) : activeFile ? (
                <>
                  <p className="truncate text-base font-bold text-[#1A2340]">
                    {activeFile.filename}
                  </p>
                  <p className="mt-2 text-xs text-[#5A6379]">
                    {activeFile.extension.toUpperCase()} · {formatFileSize(activeFile.size)}
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-[#E6E7EC] bg-[#F7F6F2] px-4 py-8 text-center">
                  <Circle aria-hidden="true" className="mx-auto text-[#98A0B0]" size={22} />
                  <p className="mt-3 text-sm font-bold text-[#1A2340]">Hover or click an item</p>
                  <p className="mt-1 text-xs leading-5 text-[#5A6379]">Evidence, source lineage, and node data stay visible here.</p>
                </div>
              )}
            </div>
          </aside>
          </div>

          <footer className="border-t border-[#E6E7EC] bg-white px-5 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity aria-hidden="true" className="text-[#2F63E6]" size={15} />
                <p className="text-sm font-bold text-[#1A2340]">Activity</p>
                <p className="text-xs text-[#5A6379]">Processing log · newest first</p>
              </div>
              <p className="text-xs font-semibold text-[#5A6379]">Every action links to its source</p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {activityRows.length > 0 ? (
                activityRows.map((event) => (
                  <div className="rounded-md border border-[#E6E7EC] bg-[#F7F6F2] px-3 py-2" key={event.id}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${event.status === "completed" ? "bg-[#3D9E8E]" : event.status === "failed" ? "bg-[#B4780F]" : "bg-[#2F63E6]"}`} />
                      <span className="truncate text-[11px] font-semibold text-[#5A6379]">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-[#1A2340]">{event.message}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-5 rounded-md border border-dashed border-[#E6E7EC] bg-[#F7F6F2] px-3 py-5 text-center text-xs font-medium text-[#5A6379]">
                  Activity appears as the dossier is processed.
                </div>
              )}
            </div>
          </footer>
        </div>
      </LayoutGroup>
      {children}
    </div>
  );
}
