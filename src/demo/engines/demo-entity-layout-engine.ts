import type { MapLayer } from "@/lib/pipeline/contracts";
import type { GraphLayoutEngine, MapNodeLayout } from "@/lib/pipeline/layout";

const entityLayouts: Record<string, MapNodeLayout> = {
  "entity:account": { position: { x: 350, y: 320 }, width: 210 },
  "entity:approval": { position: { x: 670, y: 320 }, width: 210 },
  "entity:asset": { position: { x: 30, y: 320 }, width: 210 },
  "entity:invoice": { position: { x: 670, y: 70 }, width: 210 },
  "entity:payment": { position: { x: 990, y: 70 }, width: 210 },
  "entity:user": { position: { x: 350, y: 70 }, width: 210 },
  "entity:vendor": { position: { x: 30, y: 70 }, width: 210 },
};

const fallbackLayout: MapNodeLayout = {
  position: { x: 990, y: 320 },
  width: 210,
};

export class DemoEntityLayoutEngine implements GraphLayoutEngine {
  async layout(layer: MapLayer): Promise<MapLayer> {
    if (layer.stage !== "entities") {
      return layer;
    }

    return {
      ...layer,
      nodes: layer.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          layout: entityLayouts[node.id] ?? fallbackLayout,
        },
      })),
    };
  }
}
