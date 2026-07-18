import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import type { GraphLayoutEngine, MapNodeLayout } from "@/lib/pipeline/layout";

const groupLayouts: Record<string, MapNodeLayout> = {
  "file-group:agent-intake": {
    height: 360,
    position: { x: 52, y: 52 },
    width: 280,
  },
  "file-group:accounts_payable": {
    height: 230,
    position: { x: 378, y: 52 },
    width: 250,
  },
  "file-group:accounts_receivable": {
    height: 230,
    position: { x: 672, y: 52 },
    width: 250,
  },
  "file-group:audit_planning": {
    height: 230,
    position: { x: 672, y: 608 },
    width: 250,
  },
  "file-group:assets": {
    height: 230,
    position: { x: 640, y: 52 },
    width: 250,
  },
  "file-group:controls_permissions": {
    height: 230,
    position: { x: 378, y: 330 },
    width: 250,
  },
  "file-group:corporate_structure": {
    height: 230,
    position: { x: 966, y: 608 },
    width: 250,
  },
  "file-group:cross_domain_metadata": {
    height: 230,
    position: { x: 378, y: 608 },
    width: 250,
  },
  "file-group:controls": {
    height: 230,
    position: { x: 52, y: 330 },
    width: 250,
  },
  "file-group:financial-reporting": {
    height: 230,
    position: { x: 378, y: 330 },
    width: 250,
  },
  "file-group:financial_reporting": {
    height: 230,
    position: { x: 672, y: 330 },
    width: 250,
  },
  "file-group:fixed_assets": {
    height: 230,
    position: { x: 966, y: 52 },
    width: 250,
  },
  "file-group:general-ledger": {
    height: 230,
    position: { x: 52, y: 608 },
    width: 250,
  },
  "file-group:general_ledger": {
    height: 230,
    position: { x: 966, y: 330 },
    width: 250,
  },
  "file-group:other": {
    height: 230,
    position: { x: 640, y: 330 },
    width: 250,
  },
  "file-group:subledgers": {
    height: 230,
    position: { x: 346, y: 52 },
    width: 250,
  },
  "file-group:supporting-documents": {
    height: 230,
    position: { x: 934, y: 52 },
    width: 250,
  },
  "file-group:supporting_documents": {
    height: 230,
    position: { x: 52, y: 886 },
    width: 250,
  },
};

function fallbackGroupLayout(index: number): MapNodeLayout {
  return {
    height: 230,
    position: {
      x: 52 + (index % 4) * 294,
      y: 52 + Math.floor(index / 4) * 278,
    },
    width: 250,
  };
}

function withLayout(node: MapNode, layout: MapNodeLayout, details = {}): MapNode {
  return {
    ...node,
    data: {
      ...node.data,
      ...details,
      layout,
    },
  };
}

function readGroupWidth(node: MapNode | undefined) {
  if (!node) {
    return undefined;
  }

  return groupLayouts[node.id]?.width;
}

export class DemoFileMapLayoutEngine implements GraphLayoutEngine {
  async layout(layer: MapLayer): Promise<MapLayer> {
    if (layer.stage !== "files") {
      return layer;
    }

    const fileNodesByGroup = new Map<string, MapNode[]>();

    for (const node of layer.nodes) {
      if (!node.parentId) {
        continue;
      }

      const nodes = fileNodesByGroup.get(node.parentId) ?? [];
      nodes.push(node);
      fileNodesByGroup.set(node.parentId, nodes);
    }

    return {
      ...layer,
      nodes: layer.nodes.map((node) => {
        if (node.kind === "file_group") {
          const fileCount = fileNodesByGroup.get(node.id)?.length ?? 0;
          const baseLayout = groupLayouts[node.id] ?? fallbackGroupLayout(layer.nodes.filter((current) => current.kind === "file_group").findIndex((current) => current.id === node.id));
          const layout = {
            ...baseLayout,
            height: Math.max(baseLayout.height ?? 0, 74 + fileCount * 64),
          };

          return withLayout(node, layout, { fileCount });
        }

        if (node.kind === "file" && node.parentId) {
          const groupFiles = fileNodesByGroup.get(node.parentId) ?? [];
          const position = groupFiles.findIndex(
            (groupFile) => groupFile.id === node.id,
          );

          return withLayout(node, {
            height: 52,
            position: { x: 14, y: 58 + position * 60 },
            width: (readGroupWidth(layer.nodes.find((current) => current.id === node.parentId)) ?? 250) - 28,
          });
        }

        return node;
      }),
    };
  }
}
