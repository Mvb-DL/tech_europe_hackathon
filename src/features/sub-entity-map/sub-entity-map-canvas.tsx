"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
} from "@xyflow/react";
import type { Edge, Node, NodeProps, NodeTypes, ReactFlowInstance } from "@xyflow/react";
import { ChevronDown, ChevronRight, Layers2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import { readMapNodeLayout } from "@/lib/pipeline/layout";
import { usePipelineStore } from "@/lib/pipeline/store";

type SubEntityFlowNodeData = {
  childCount?: number;
  isCollapsed?: boolean;
  mapNode: MapNode;
  onToggle?: () => void;
};

type SubEntityFlowNode = Node<SubEntityFlowNodeData, "subEntityGroup" | "subEntity">;

type SubEntityMapCanvasProps = {
  layer?: MapLayer;
  onSelectNode: (nodeId: string | null) => void;
};

function SubEntityGroupNode({ data, selected }: NodeProps<SubEntityFlowNode>) {
  const isCollapsed = Boolean(data.isCollapsed);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={`h-full w-full rounded-md border bg-[#F7F6F2] ${
        selected ? "border-[#2F63E6] ring-2 ring-[#2F63E6]" : "border-[#E6E7EC]"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.24 }}
    >
      <Handle position={Position.Top} type="source" />
      <div className="flex items-center justify-between gap-2 border-b border-[#E6E7EC] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Layers2 aria-hidden="true" className="text-[#2F63E6]" size={16} />
          <p className="truncate text-sm font-semibold text-[#1A2340]">
            {data.mapNode.title}
          </p>
        </div>
        <button
          aria-label={isCollapsed ? `Expand ${data.mapNode.title}` : `Collapse ${data.mapNode.title}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5A6379] hover:bg-[#F2F3F6] hover:text-[#1A2340] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle?.();
          }}
          title={isCollapsed ? "Expand components" : "Collapse components"}
          type="button"
        >
          {isCollapsed ? (
            <ChevronRight aria-hidden="true" size={16} />
          ) : (
            <ChevronDown aria-hidden="true" size={16} />
          )}
        </button>
      </div>
      <p className="px-3 pt-2 text-xs font-medium text-[#5A6379]">
        {data.childCount ?? 0} demo components
      </p>
    </motion.div>
  );
}

function SubEntityNode({ data, selected }: NodeProps<SubEntityFlowNode>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={`h-full w-full rounded-md border bg-white px-3 py-2 shadow-sm ${
        selected ? "border-[#2F63E6] ring-2 ring-[#2F63E6]" : "border-[#E6E7EC]"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
    >
      <Handle position={Position.Top} type="target" />
      <p className="truncate text-sm font-semibold text-[#1A2340]">
        {data.mapNode.title}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#B4780F]">
        Demo component
      </p>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  subEntity: SubEntityNode,
  subEntityGroup: SubEntityGroupNode,
};

function readChildCount(node: MapNode) {
  const childCount = node.data.childCount;
  return typeof childCount === "number" ? childCount : 0;
}

function buildFlowNodes(
  layer: MapLayer | undefined,
  collapsedNodeIds: string[],
  toggleCollapsedNode: (nodeId: string) => void,
): SubEntityFlowNode[] {
  return (layer?.nodes ?? []).map((mapNode) => {
    const layout = readMapNodeLayout(mapNode);
    const isGroup = mapNode.kind === "entity";
    const isCollapsed = collapsedNodeIds.includes(mapNode.id);
    const parentIsCollapsed = mapNode.parentId
      ? collapsedNodeIds.includes(mapNode.parentId)
      : false;

    return {
      data: {
        childCount: isGroup ? readChildCount(mapNode) : undefined,
        isCollapsed: isGroup ? isCollapsed : undefined,
        mapNode,
        onToggle: isGroup ? () => toggleCollapsedNode(mapNode.id) : undefined,
      },
      draggable: isGroup,
      extent: mapNode.parentId ? "parent" : undefined,
      hidden: parentIsCollapsed,
      id: mapNode.id,
      parentId: mapNode.parentId,
      position: layout?.position ?? { x: 0, y: 0 },
      selectable: true,
      style: {
        height: isGroup && isCollapsed ? 64 : (layout?.height ?? 56),
        width: layout?.width,
      },
      type: isGroup ? "subEntityGroup" : "subEntity",
    };
  });
}

export function SubEntityMapCanvas({ layer, onSelectNode }: SubEntityMapCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const collapsedNodeIds = usePipelineStore((state) => state.collapsedNodeIds);
  const toggleCollapsedNode = usePipelineStore((state) => state.toggleCollapsedNode);
  const initialNodes = useMemo(
    () => buildFlowNodes(layer, collapsedNodeIds, toggleCollapsedNode),
    [collapsedNodeIds, layer, toggleCollapsedNode],
  );
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowInstance, setFlowInstance] = useState<
    ReactFlowInstance<SubEntityFlowNode> | null
  >(null);
  const previousGroupCountRef = useRef(0);
  const flowEdges = useMemo<Edge[]>(
    () =>
      (layer?.edges ?? []).map((edge) => ({
        hidden: collapsedNodeIds.includes(edge.source),
        id: edge.id,
        label: edge.status,
        source: edge.source,
        style: { stroke: "#5A6379", strokeDasharray: "4 3", strokeWidth: 1.25 },
        target: edge.target,
        type: "smoothstep",
      })),
    [collapsedNodeIds, layer],
  );

  useEffect(() => {
    setFlowNodes((currentNodes) => {
      const currentPositions = new Map(
        currentNodes.map((node) => [node.id, node.position]),
      );

      return initialNodes.map((node) => ({
        ...node,
        position: currentPositions.get(node.id) ?? node.position,
      }));
    });
  }, [initialNodes, setFlowNodes]);

  const groupCount = flowNodes.filter((node) => node.type === "subEntityGroup").length;

  useEffect(() => {
    if (!flowInstance || groupCount === 0) {
      previousGroupCountRef.current = groupCount;
      return;
    }

    const shouldFit = groupCount === 1 || groupCount - previousGroupCountRef.current >= 2;
    previousGroupCountRef.current = groupCount;

    if (!shouldFit) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      flowInstance.fitView({
        duration: shouldReduceMotion ? 0 : 280,
        maxZoom: 1,
        padding: 0.16,
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [flowInstance, groupCount, shouldReduceMotion]);

  return (
    <div className="relative h-full rounded-md border border-[#E6E7EC] bg-white">
      <ReactFlow<SubEntityFlowNode>
        edges={flowEdges}
        nodes={flowNodes}
        nodesConnectable={false}
        nodeTypes={nodeTypes}
        onInit={setFlowInstance}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onNodeMouseEnter={(_, node) => onSelectNode(node.id)}
        onNodeDoubleClick={(_, node) => {
          if (node.type === "subEntityGroup") {
            toggleCollapsedNode(node.id);
          }
        }}
        onNodesChange={onNodesChange}
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
            <p className="text-base font-semibold text-[#1A2340]">Sub-entity map is empty</p>
            <p className="mt-2 text-sm leading-6 text-[#5A6379]">
              Start the demo to expand entity candidates into traceable components.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
