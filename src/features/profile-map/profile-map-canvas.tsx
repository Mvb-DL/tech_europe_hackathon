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
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "derived":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "inferred":
      return "border-dashed border-amber-300 bg-amber-50 text-amber-800";
  }
}

function statusClasses(status: MapNodeStatus) {
  if (status === "warning") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
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
      className={`h-full w-full border bg-white p-3 shadow-sm ${
        selected
          ? "border-blue-700 ring-2 ring-blue-700"
          : hasGap
            ? "border-amber-300"
            : "border-slate-300"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
    >
      <Handle position={Position.Left} type="target" />
      <div className="flex items-start gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center border border-slate-300 bg-slate-50 text-slate-700">
          <UserRound aria-hidden="true" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
            {mapNode.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-600">{mapNode.subtitle}</p>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(mapNode.status)}`}
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
          <div key={`${metric.label}:${metric.value}`} className="min-w-0 border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="truncate text-[11px] font-medium text-slate-500">{metric.label}</p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="truncate text-xs font-semibold text-slate-950">{metric.value}</p>
              <span
                className={`shrink-0 border px-1 py-0.5 text-[9px] font-bold uppercase ${provenanceClasses(metric.provenance)}`}
                title={`${metric.provenance} from ${metric.sourceLabel}`}
              >
                {metric.provenance.slice(0, 3)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>Source coverage</span>
          <span>{coverage}%</span>
        </div>
        <div className="mt-1 h-1.5 bg-slate-200">
          <div
            className={coverage >= 95 ? "h-full bg-emerald-700" : "h-full bg-amber-700"}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>{mapNode.sourceIds.length} source files</span>
        {hasGap ? (
          <span className="inline-flex items-center gap-1 text-amber-800">
            <CircleDashed aria-hidden="true" size={12} />
            {gaps.length} gap{gaps.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-emerald-800">No open gaps</span>
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
        style: { stroke: "#b45309", strokeDasharray: "5 5", strokeWidth: 1.4 },
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
    <div className="relative h-full border border-slate-300 bg-white">
      <ReactFlow
        edges={flowEdges}
        nodes={flowNodes}
        nodesConnectable={false}
        nodeTypes={nodeTypes}
        onInit={setFlowInstance}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        panOnScroll
        preventScrolling={false}
      >
        <Background color="#cbd5e1" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm bg-white/90 p-5">
            <p className="text-base font-semibold text-slate-950">
              Profile map is empty
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start the demo to consolidate sub-entities into traceable business profiles.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
