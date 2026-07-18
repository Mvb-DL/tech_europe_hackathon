import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import type { GraphLayoutEngine, MapNodeLayout } from "@/lib/pipeline/layout";

const groupLayouts: Record<string, MapNodeLayout> = {
  "file-group:assets": {
    height: 230,
    position: { x: 640, y: 52 },
    width: 250,
  },
  "file-group:controls": {
    height: 230,
    position: { x: 52, y: 330 },
    width: 250,
  },
  "file-group:financial-reporting": {
    height: 230,
    position: { x: 346, y: 330 },
    width: 250,
  },
  "file-group:general-ledger": {
    height: 230,
    position: { x: 52, y: 52 },
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
};

const fallbackLayout: MapNodeLayout = {
  height: 230,
  position: { x: 934, y: 330 },
  width: 250,
};

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
          const baseLayout = groupLayouts[node.id] ?? fallbackLayout;
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
            width: 222,
          });
        }

        return node;
      }),
    };
  }
}
