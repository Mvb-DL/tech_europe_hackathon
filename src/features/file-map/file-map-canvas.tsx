"use client";

import {
  Background,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import type {
  Edge,
  Node,
  NodeProps,
  NodeTypes,
  ReactFlowInstance,
} from "@xyflow/react";
import { FileText, FolderTree } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import { readMapNodeLayout } from "@/lib/pipeline/layout";

type FileFlowNodeData = {
  activeFileId?: string;
  mapNode: MapNode;
};

type FileFlowNode = Node<FileFlowNodeData, "fileCard" | "fileGroup">;

type FileMapCanvasProps = {
  activeFileId?: string;
  emptyTitle: string;
  layer?: MapLayer;
  onSelectNode: (nodeId: string | null) => void;
};

function getFileCount(node: MapNode) {
  const fileCount = node.data.fileCount;

  return typeof fileCount === "number" ? fileCount : node.sourceIds.length;
}

function FileGroupNode({
  data,
  selected,
}: NodeProps<FileFlowNode>) {
  const { mapNode } = data;

  return (
    <div
      className={`h-full w-full rounded-md border bg-[#F7F6F2] ${
        selected ? "border-[#2F63E6] ring-2 ring-[#2F63E6]" : "border-[#E6E7EC]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#E6E7EC] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree aria-hidden="true" className="text-[#3D9E8E]" size={15} />
          <p className="truncate text-sm font-semibold text-[#1A2340]">
            {mapNode.title}
          </p>
        </div>
        <span className="rounded-full bg-[#E5F4F1] px-2 py-0.5 text-xs font-bold text-[#247567]">
          {getFileCount(mapNode)}
        </span>
      </div>
      <p className="px-3 pt-2 text-xs font-medium text-[#5A6379]">Mapped group</p>
    </div>
  );
}

function FileCardNode({
  data,
  selected,
}: NodeProps<FileFlowNode>) {
  const { mapNode } = data;
  const fileId = mapNode.sourceIds[0];
  const shouldReduceMotion = useReducedMotion();
  const isActive = data.activeFileId === fileId;

  return (
    <motion.div
      animate={{
        opacity: 1,
        scale: isActive && !shouldReduceMotion ? 1.02 : 1,
      }}
      className={`h-full w-full border bg-white px-3 py-2 shadow-sm ${
        selected
          ? "border-[#2F63E6] ring-2 ring-[#2F63E6]"
          : "border-[#E6E7EC]"
      }`}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
      layoutId={`file-card-${fileId}`}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.32, ease: "easeOut" }
      }
    >
      <div className="flex items-start gap-2">
        <FileText aria-hidden="true" className="mt-0.5 text-[#5A6379]" size={15} />
        <p className="line-clamp-2 text-xs font-semibold leading-4 text-[#1A2340]">
          {mapNode.title}
        </p>
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#3D9E8E]">
        {typeof mapNode.data.result === "object" && mapNode.data.result !== null && "method" in mapNode.data.result
          ? String(mapNode.data.result.method)
          : "Placed"}
      </p>
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  fileCard: FileCardNode,
  fileGroup: FileGroupNode,
};

function toFlowNode(
  mapNode: MapNode,
  activeFileId: string | undefined,
): FileFlowNode {
  const layout = readMapNodeLayout(mapNode);

  return {
    data: {
      activeFileId,
      mapNode,
    },
    draggable: false,
    extent: mapNode.parentId ? "parent" : undefined,
    id: mapNode.id,
    parentId: mapNode.parentId,
    position: layout?.position ?? { x: 0, y: 0 },
    selectable: true,
    style: {
      height: layout?.height,
      width: layout?.width,
    },
    type: mapNode.kind === "file_group" ? "fileGroup" : "fileCard",
  };
}

export function FileMapCanvas({
  activeFileId,
  emptyTitle,
  layer,
  onSelectNode,
}: FileMapCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(
    null,
  );
  const previousLayoutRef = useRef({ fileCount: 0, groupCount: 0 });
  const flowNodes = useMemo(
    () =>
      layer?.nodes.map((node) => toFlowNode(node, activeFileId)) ?? [],
    [activeFileId, layer],
  );
  const flowEdges = useMemo<Edge[]>(
    () =>
      layer?.edges.map((edge) => ({
        id: edge.id,
        label: edge.relation === "contains" ? undefined : edge.relation,
        source: edge.source,
        style: edge.relation === "contains" ? { stroke: "#98A0B0" } : { stroke: "#B4780F", strokeDasharray: "5 4" },
        target: edge.target,
        type: "smoothstep",
      })) ?? [],
    [layer],
  );
  const fileCount = flowNodes.filter((node) => node.type === "fileCard").length;
  const groupCount = flowNodes.filter((node) => node.type === "fileGroup").length;

  useEffect(() => {
    if (!flowInstance || fileCount === 0) {
      previousLayoutRef.current = { fileCount, groupCount };
      return;
    }

    const previousLayout = previousLayoutRef.current;
    const shouldFit =
      fileCount === 1 ||
      groupCount > previousLayout.groupCount ||
      fileCount % 3 === 0;

    previousLayoutRef.current = { fileCount, groupCount };

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
  }, [fileCount, flowInstance, groupCount, shouldReduceMotion]);

  return (
    <div className="relative h-full rounded-md border border-[#E6E7EC] bg-white">
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
        <Background color="#E6E7EC" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {flowNodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm rounded-lg border border-[#E6E7EC] bg-white/95 p-5 shadow-[0_12px_30px_rgba(26,35,64,0.08)]">
            <p className="text-base font-semibold text-[#1A2340]">
              {emptyTitle} map is empty
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5A6379]">
              Start the demo to place uploaded files into traceable groups.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
