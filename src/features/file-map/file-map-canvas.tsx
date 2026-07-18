"use client";

import {
  Background,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import type {
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
      className={`h-full w-full border bg-slate-50/90 ${
        selected ? "border-emerald-700 ring-1 ring-emerald-700" : "border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree aria-hidden="true" className="text-emerald-700" size={15} />
          <p className="truncate text-sm font-semibold text-slate-950">
            {mapNode.title}
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {getFileCount(mapNode)}
        </span>
      </div>
      <p className="px-3 pt-2 text-xs font-medium text-slate-500">
        Demo group
      </p>
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
          ? "border-emerald-700 ring-1 ring-emerald-700"
          : "border-slate-300"
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
        <FileText aria-hidden="true" className="mt-0.5 text-slate-600" size={15} />
        <p className="line-clamp-2 text-xs font-semibold leading-4 text-slate-950">
          {mapNode.title}
        </p>
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
        Placed
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
    <div className="relative h-full border border-slate-300 bg-white">
      <ReactFlow
        edges={[]}
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
              {emptyTitle} map is empty
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start the demo to place uploaded files into traceable groups.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
