import type { MapLayer } from "@/lib/pipeline/contracts";
import type { GraphLayoutEngine, MapNodeLayout } from "@/lib/pipeline/layout";

const profileLayouts: Record<string, MapNodeLayout> = {
  "profile:anlage-a-2231": { position: { x: 330, y: 320 }, width: 260 },
  "profile:m-brandt": { position: { x: 350, y: 70 }, width: 250 },
  "profile:nordwerk-logistik": { position: { x: 20, y: 320 }, width: 280 },
  "profile:ratio-consulting": { position: { x: 20, y: 70 }, width: 290 },
  "profile:rechnung-re-2025-0442": { position: { x: 680, y: 190 }, width: 280 },
};

const fallbackLayout: MapNodeLayout = {
  position: { x: 680, y: 420 },
  width: 260,
};

export class DemoProfileLayoutEngine implements GraphLayoutEngine {
  async layout(layer: MapLayer): Promise<MapLayer> {
    if (layer.stage !== "profiles") {
      return layer;
    }

    return {
      ...layer,
      nodes: layer.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          layout: {
            height: node.status === "warning" ? 188 : 166,
            ...(profileLayouts[node.id] ?? fallbackLayout),
          },
        },
      })),
    };
  }
}
