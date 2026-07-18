import type { MapLayer, MapNode } from "./contracts";

export interface GraphLayoutEngine {
  layout(layer: MapLayer): Promise<MapLayer>;
}

export type MapNodeLayout = {
  height?: number;
  position: {
    x: number;
    y: number;
  };
  width?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function readMapNodeLayout(node: MapNode): MapNodeLayout | undefined {
  const layout = node.data.layout;

  if (
    typeof layout !== "object" ||
    layout === null ||
    !("position" in layout) ||
    typeof layout.position !== "object" ||
    layout.position === null ||
    !("x" in layout.position) ||
    !("y" in layout.position) ||
    !isFiniteNumber(layout.position.x) ||
    !isFiniteNumber(layout.position.y)
  ) {
    return undefined;
  }

  const layoutRecord = layout as Record<string, unknown>;
  const position = layoutRecord.position as Record<string, unknown>;

  return {
    height: isFiniteNumber(layoutRecord.height)
      ? layoutRecord.height
      : undefined,
    position: {
      x: position.x as number,
      y: position.y as number,
    },
    width: isFiniteNumber(layoutRecord.width) ? layoutRecord.width : undefined,
  };
}
