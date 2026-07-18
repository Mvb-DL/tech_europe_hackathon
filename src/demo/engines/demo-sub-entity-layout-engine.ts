import type { MapLayer, MapNode } from "@/lib/pipeline/contracts";
import type { GraphLayoutEngine, MapNodeLayout } from "@/lib/pipeline/layout";

const groupWidth = 280;
const groupHeaderHeight = 64;
const childHeight = 52;
const childGap = 10;
const groupGap = 48;

function getChildCount(node: MapNode) {
  const childCount = node.data.childCount;
  return typeof childCount === "number" && childCount >= 0 ? childCount : 0;
}

function groupLayout(index: number, childCount: number): MapNodeLayout {
  const height = groupHeaderHeight + childCount * (childHeight + childGap) + 16;

  return {
    height,
    position: {
      x: 40 + (index % 3) * (groupWidth + groupGap),
      y: 48 + Math.floor(index / 3) * 430,
    },
    width: groupWidth,
  };
}

export class DemoSubEntityLayoutEngine implements GraphLayoutEngine {
  async layout(layer: MapLayer): Promise<MapLayer> {
    if (layer.stage !== "sub_entities") {
      return layer;
    }

    const groupIndexes = new Map(
      layer.nodes
        .filter((node) => node.kind === "entity")
        .map((node, index) => [node.id, index]),
    );
    const childIndexes = new Map<string, number>();

    for (const child of layer.nodes.filter(
      (node) => node.kind === "sub_entity" && node.parentId,
    )) {
      childIndexes.set(
        child.id,
        [...childIndexes.keys()].filter((id) => {
          const node = layer.nodes.find((currentNode) => currentNode.id === id);
          return node?.parentId === child.parentId;
        }).length,
      );
    }

    return {
      ...layer,
      nodes: layer.nodes.map((node) => {
        const parentIndex = groupIndexes.get(node.id);

        if (parentIndex !== undefined) {
          return {
            ...node,
            data: {
              ...node.data,
              layout: groupLayout(parentIndex, getChildCount(node)),
            },
          };
        }

        const childIndex = childIndexes.get(node.id);

        if (childIndex !== undefined) {
          return {
            ...node,
            data: {
              ...node.data,
              layout: {
                height: childHeight,
                position: { x: 14, y: groupHeaderHeight + childIndex * (childHeight + childGap) },
                width: groupWidth - 28,
              },
            },
          };
        }

        return node;
      }),
    };
  }
}
