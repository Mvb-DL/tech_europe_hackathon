"use client";

import { Background, Controls, Handle, Position, ReactFlow } from "@xyflow/react";
import type {
  Edge,
  Node,
  NodeProps,
  NodeTypes,
  ReactFlowInstance,
} from "@xyflow/react";
import { BadgeCheck, CircleDashed, FileWarning, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayer, MapNode, MapNodeStatus } from "@/lib/pipeline/contracts";
import { readMapNodeLayout } from "@/lib/pipeline/layout";

type Provenance = "observed" | "derived" | "inferred";

type ProfileMetric = {
  label: string;
  provenance: Provenance;
  sourceLabel: string;
  value: string;
};

type ProfileFlowNodeData = {
  mapNode: MapNode;
};

type ProfileFlowNode = Node<ProfileFlowNodeData, "profile">;

type ProfileMapCanvasProps = {
  layer?: MapLayer;
  onSelectNode: (nodeId: string | null) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMetrics(node: MapNode): ProfileMetric[] {
  if (!Array.isArray(node.data.metrics)) {
    return [];
  }

  return node.data.metrics.filter((metric): metric is ProfileMetric => {
    if (!isRecord(metric)) {
      return false;
    }

    return (
      typeof metric.label === "string" &&
      typeof metric.value === "string" &&
      typeof metric.sourceLabel === "string" &&
      (metric.provenance === "observed" ||
        metric.provenance === "derived" ||
        metric.provenance === "inferred")
    );
  });
}

function readCoverage(node: MapNode) {
  return typeof node.data.sourceCoverage === "number"
    ? node.data.sourceCoverage
    : 0;
}

function readGaps(node: MapNode) {
  return Array.isArray(node.data.dataGaps)
    ? node.data.dataGaps.filter((gap): gap is string => typeof gap === "string")
    : [];
}

function provenanceClasses(provenance: Provenance) {
  switch (provenance) {
    case "observed":
      return "border-[#3D9E8E]/30 bg-[#E5F4F1] text-[#247567]";
    case "derived":
      return "border-[#2F63E6]/25 bg-[#EDF1FC] text-[#2F63E6]";
    case "inferred":
      return "border-dashed border-[#B4780F]/40 bg-[#FBF2DE] text-[#8A5A08]";
  }
}

function statusClasses(status: MapNodeStatus) {
  if (status === "warning") {
    return "border-[#B4780F]/40 bg-[#FBF2DE] text-[#8A5A08]";
  }

  return "border-[#3D9E8E]/30 bg-[#E5F4F1] text-[#247567]";
}

function ProfileNode({ data, selected }: NodeProps<ProfileFlowNode>) {
  const shouldReduceMotion = useReducedMotion();
  const { mapNode } = data;
  const metrics = readMetrics(mapNode).slice(0, 4);
  const coverage = readCoverage(mapNode);
  const gaps = readGaps(mapNode);
  const hasGap = gaps.length > 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`h-full w-full rounded-md border bg-white p-3 shadow-sm ${
        selected
          ? "border-[#2F63E6] ring-2 ring-[#2F63E6]"
          : hasGap
            ? "border-[#B4780F]/40"
            : "border-[#E6E7EC]"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
    >
      <Handle position={Position.Left} type="target" />
      <div className="flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#E6E7EC] bg-[#F7F6F2] text-[#5A6379]">
          <UserRound aria-hidden="true" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#1A2340]">
            {mapNode.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#5A6379]">{mapNode.subtitle}</p>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(mapNode.status)}`}
          >
            {hasGap ? (
              <FileWarning aria-hidden="true" size={11} />
            ) : (
              <BadgeCheck aria-hidden="true" size={11} />
            )}
            {hasGap ? "Needs review" : "Complete"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={`${metric.label}:${metric.value}`} className="min-w-0 rounded-md border border-[#E6E7EC] bg-[#F7F6F2] px-2 py-1.5">
            <p className="truncate text-[11px] font-medium text-[#5A6379]">{metric.label}</p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="truncate text-xs font-semibold text-[#1A2340]">{metric.value}</p>
              <span
                className={`shrink-0 rounded-full border px-1 py-0.5 text-[9px] font-bold uppercase ${provenanceClasses(metric.provenance)}`}
                title={`${metric.provenance} from ${metric.sourceLabel}`}
              >
                {metric.provenance.slice(0, 3)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#5A6379]">
          <span>Source coverage</span>
          <span>{coverage}%</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-[#F2F3F6]">
          <div
            className={`h-full rounded-full ${coverage >= 95 ? "bg-[#3D9E8E]" : "bg-[#B4780F]"}`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#5A6379]">
        <span>{mapNode.sourceIds.length} source files</span>
        {hasGap ? (
          <span className="inline-flex items-center gap-1 text-[#8A5A08]">
            <CircleDashed aria-hidden="true" size={12} />
            {gaps.length} gap{gaps.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-[#247567]">No open gaps</span>
        )}
      </div>
      <Handle position={Position.Right} type="source" />
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  profile: ProfileNode,
};

function toFlowNode(mapNode: MapNode): ProfileFlowNode {
  const layout = readMapNodeLayout(mapNode);

  return {
    data: { mapNode },
    draggable: false,
    id: mapNode.id,
    position: layout?.position ?? { x: 0, y: 0 },
    selectable: true,
    style: { height: layout?.height ?? 174, width: layout?.width ?? 270 },
    type: "profile",
  };
}

export function ProfileMapCanvas({ layer, onSelectNode }: ProfileMapCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);
  const previousNodeCountRef = useRef(0);
  const flowNodes = useMemo(
    () => layer?.nodes.filter((node) => node.kind === "profile").map(toFlowNode) ?? [],
    [layer],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      layer?.edges.map((edge) => ({
        id: edge.id,
        label: edge.relation,
        source: edge.source,
        style: { stroke: "#B4780F", strokeDasharray: "5 5", strokeWidth: 1.4 },
        target: edge.target,
        type: "smoothstep",
      })) ?? [],
    [layer],
  );

  useEffect(() => {
    if (!flowInstance || flowNodes.length === 0) {
      previousNodeCountRef.current = flowNodes.length;
      return;
    }

    const shouldFit =
      flowNodes.length === 1 ||
      flowNodes.length - previousNodeCountRef.current >= 2 ||
      flowNodes.length === 5;
    previousNodeCountRef.current = flowNodes.length;

    if (!shouldFit) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      flowInstance.fitView({
        duration: shouldReduceMotion ? 0 : 280,
        maxZoom: 1,
        padding: 0.18,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [flowInstance, flowNodes.length, shouldReduceMotion]);

  return (
    <div className="relative h-full rounded-md border border-[#E6E7EC] bg-white">
      <ReactFlow
        edges={flowEdges}
        nodes={flowNodes}
        nodesConnectable={false}
        nodeTypes={nodeTypes}
        onInit={setFlowInstance}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onNodeMouseEnter={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        panOnScroll
        preventScrolling={false}
      >
        <Background color="#E6E7EC" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm rounded-lg border border-[#E6E7EC] bg-white/95 p-5 shadow-[0_12px_30px_rgba(26,35,64,0.08)]">
            <p className="text-base font-semibold text-[#1A2340]">
              Profile map is empty
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5A6379]">
              Start the demo to consolidate sub-entities into traceable business profiles.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
