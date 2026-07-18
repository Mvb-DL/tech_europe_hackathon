"use client";

import { Background, Controls, Handle, Position, ReactFlow } from "@xyflow/react";
import type {
  Edge,
  Node,
  NodeProps,
  NodeTypes,
  ReactFlowInstance,
} from "@xyflow/react";
import { Boxes } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import { readMapNodeLayout } from "@/lib/pipeline/layout";

type EntityFlowNodeData = {
  mapNode: MapNode;
};

type EntityFlowNode = Node<EntityFlowNodeData, "entity">;

type EntityMapCanvasProps = {
  layer?: MapLayer;
  onSelectNode: (nodeId: string | null) => void;
};

function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const shouldReduceMotion = useReducedMotion();
  const { mapNode } = data;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={`h-full w-full border bg-white p-3 shadow-sm ${
        selected
          ? "border-[#2F63E6] ring-2 ring-[#2F63E6]"
          : "border-[#E6E7EC]"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.28, ease: "easeOut" }
      }
    >
      <Handle position={Position.Left} type="target" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Boxes aria-hidden="true" className="text-[#2F63E6]" size={16} />
          <p className="truncate text-sm font-semibold text-[#1A2340]">
            {mapNode.title}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#B4780F]/30 bg-[#FBF2DE] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A5A08]">
          Candidate
        </span>
      </div>
      <p className="mt-4 text-xs text-[#5A6379]">
        {mapNode.sourceIds.length} source file
        {mapNode.sourceIds.length === 1 ? "" : "s"}
      </p>
      <Handle position={Position.Right} type="source" />
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

function toFlowNode(mapNode: MapNode): EntityFlowNode {
  const layout = readMapNodeLayout(mapNode);

  return {
    data: { mapNode },
    draggable: false,
    id: mapNode.id,
    position: layout?.position ?? { x: 0, y: 0 },
    selectable: true,
    style: { height: layout?.height ?? 104, width: layout?.width ?? 210 },
    type: "entity",
  };
}

export function EntityMapCanvas({ layer, onSelectNode }: EntityMapCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(
    null,
  );
  const previousNodeCountRef = useRef(0);
  const flowNodes = useMemo(
    () => layer?.nodes.filter((node) => node.kind === "entity").map(toFlowNode) ?? [],
    [layer],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      layer?.edges.map((edge) => ({
        id: edge.id,
        label: edge.status,
        source: edge.source,
        style: { stroke: "#B4780F", strokeDasharray: "5 4", strokeWidth: 1.5 },
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

    const previousNodeCount = previousNodeCountRef.current;
    const shouldFit =
      flowNodes.length === 1 ||
      flowNodes.length - previousNodeCount >= 2 ||
      flowNodes.length === 7;
    previousNodeCountRef.current = flowNodes.length;

    if (!shouldFit) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      flowInstance.fitView({
        duration: shouldReduceMotion ? 0 : 280,
        maxZoom: 1.05,
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
              Entity map is empty
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5A6379]">
              Start the demo to create traceable entity candidates from mapped file groups.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
