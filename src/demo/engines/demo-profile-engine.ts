import type {
  MapEdge,
  MapLayer,
  MapNode,
  PipelineEvent,
  PipelineRunStatus,
  PipelineSnapshotPayload,
} from "@/lib/pipeline/contracts";
import type { ProfileEngine } from "@/lib/pipeline/engines";

type Provenance = "observed" | "derived" | "inferred";

type ProfileMetric = {
  label: string;
  provenance: Provenance;
  sourceLabel: string;
  value: string;
};

type ProfileDefinition = {
  gaps: string[];
  id: string;
  lineageTitles: string[];
  metrics: ProfileMetric[];
  sourceCoverage: number;
  status: MapNode["status"];
  subtitle: string;
  title: string;
};

const profileDefinitions: ProfileDefinition[] = [
  {
    gaps: [
      "No goods receipts matched to any invoice.",
      "Bank account changed once after first payment.",
    ],
    id: "profile:ratio-consulting",
    lineageTitles: ["Identity", "Bank accounts", "Invoices", "Payments", "Master-data changes"],
    metrics: [
      {
        label: "Invoiced",
        provenance: "derived",
        sourceLabel: "Lieferantenbuchungen.txt",
        value: "€248,000",
      },
      {
        label: "Paid",
        provenance: "derived",
        sourceLabel: "Sachkontobuchungen.txt",
        value: "€248,000",
      },
      {
        label: "Invoices",
        provenance: "observed",
        sourceLabel: "Lieferantenbuchungen.txt",
        value: "5",
      },
      {
        label: "Goods receipts",
        provenance: "inferred",
        sourceLabel: "Wareneingangsliste_2025.csv",
        value: "0",
      },
    ],
    sourceCoverage: 96,
    status: "warning",
    subtitle: "Vendor · ID 209101",
    title: "Ratio Consulting GmbH",
  },
  {
    gaps: [],
    id: "profile:nordwerk-logistik",
    lineageTitles: ["Identity", "Invoices", "Payments"],
    metrics: [
      {
        label: "Invoiced",
        provenance: "derived",
        sourceLabel: "Lieferantenbuchungen.txt",
        value: "€612,400",
      },
      {
        label: "Invoices",
        provenance: "observed",
        sourceLabel: "Lieferantenbuchungen.txt",
        value: "41",
      },
    ],
    sourceCoverage: 99,
    status: "ready",
    subtitle: "Vendor · ID 204877",
    title: "Nordwerk Logistik GmbH",
  },
  {
    gaps: [],
    id: "profile:m-brandt",
    lineageTitles: ["Identity", "Access", "Approvals"],
    metrics: [
      {
        label: "Approvals",
        provenance: "observed",
        sourceLabel: "Freigabe-Log_2025.csv",
        value: "8",
      },
      {
        label: "Roles",
        provenance: "observed",
        sourceLabel: "Berechtigungsauswertung_2025.xlsx",
        value: "2",
      },
    ],
    sourceCoverage: 100,
    status: "ready",
    subtitle: "User · brandt.m",
    title: "M. Brandt",
  },
  {
    gaps: [],
    id: "profile:anlage-a-2231",
    lineageTitles: ["Identity", "Register details", "Lifecycle records"],
    metrics: [
      {
        label: "Book value",
        provenance: "observed",
        sourceLabel: "Anlagen.txt",
        value: "€38,900",
      },
      {
        label: "Acquired",
        provenance: "observed",
        sourceLabel: "Anlagenbuchungen.txt",
        value: "2019",
      },
    ],
    sourceCoverage: 93,
    status: "ready",
    subtitle: "Asset · Gabelstapler",
    title: "Anlage A-2231",
  },
  {
    gaps: ["No matched goods receipt is present in the supporting document layer."],
    id: "profile:rechnung-re-2025-0442",
    lineageTitles: ["Header", "Line items", "Approval", "Settlement"],
    metrics: [
      {
        label: "Amount",
        provenance: "observed",
        sourceLabel: "Lieferantenbuchungen.txt",
        value: "€61,200",
      },
      {
        label: "Matched GR",
        provenance: "inferred",
        sourceLabel: "Wareneingangsliste_2025.csv",
        value: "0",
      },
    ],
    sourceCoverage: 90,
    status: "warning",
    subtitle: "Invoice · €61,200",
    title: "Rechnung RE-2025-0442",
  },
];

const profileConnections = [
  ["profile:ratio-consulting", "profile:m-brandt"],
  ["profile:ratio-consulting", "profile:rechnung-re-2025-0442"],
  ["profile:nordwerk-logistik", "profile:m-brandt"],
  ["profile:anlage-a-2231", "profile:rechnung-re-2025-0442"],
] as const;

function createInitialLayer(dossierId: string, subEntityLayer: MapLayer): MapLayer {
  return {
    id: `layer:profiles:${dossierId}`,
    stage: "profiles",
    title: "Profile Layer",
    nodes: [],
    edges: [],
    createdAt: subEntityLayer.createdAt,
  };
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replaceAll("-", " ");
}

function findLineageNodes(subEntityLayer: MapLayer, titles: string[]) {
  const wantedTitles = new Set(titles.map(normalizeTitle));

  return subEntityLayer.nodes.filter((node) =>
    wantedTitles.has(normalizeTitle(node.title)),
  );
}

function collectSourceIds(nodes: MapNode[]) {
  return [...new Set(nodes.flatMap((node) => node.sourceIds))].sort();
}

function createProfileNode(
  layerId: string,
  definition: ProfileDefinition,
  lineageNodes: MapNode[],
  creationEventId: string,
): MapNode {
  return {
    id: definition.id,
    layerId,
    kind: "profile",
    title: definition.title,
    subtitle: definition.subtitle,
    status: definition.status,
    sourceIds: collectSourceIds(lineageNodes),
    data: {
      creationEventId,
      dataGaps: definition.gaps,
      derivation: "demo",
      lineage: lineageNodes.map((node) => ({
        id: node.id,
        sourceCount: node.sourceIds.length,
        title: node.title,
      })),
      metrics: definition.metrics,
      sourceCoverage: definition.sourceCoverage,
    },
  };
}

function connectAvailableProfiles(layer: MapLayer): MapEdge[] {
  const nodeIds = new Set(layer.nodes.map((node) => node.id));

  return profileConnections.flatMap(([source, target]) => {
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      return [];
    }

    const id = `edge:${source}:${target}`;

    if (layer.edges.some((edge) => edge.id === id)) {
      return [];
    }

    const sourceNode = layer.nodes.find((node) => node.id === source);
    const targetNode = layer.nodes.find((node) => node.id === target);

    return [
      {
        id,
        layerId: layer.id,
        relation: "demo connection",
        source,
        sourceIds: [...new Set([
          ...(sourceNode?.sourceIds ?? []),
          ...(targetNode?.sourceIds ?? []),
        ])].sort(),
        status: "candidate",
        target,
      },
    ];
  });
}

function createPayload(
  layer: MapLayer,
  runStatus: PipelineRunStatus,
): PipelineSnapshotPayload {
  return { demo: true, layer, runStatus };
}

export class DemoProfileEngine implements ProfileEngine {
  async *run(input: {
    dossierId: string;
    subEntityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent> {
    const parsedTimestampBase = Date.parse(input.subEntityLayer.createdAt);
    const timestampBase = Number.isFinite(parsedTimestampBase)
      ? parsedTimestampBase
      : 0;
    const timestampFor = (sequence: number) =>
      new Date(timestampBase + sequence * 1000).toISOString();
    const eventId = (type: string, sequence: number) =>
      `${input.dossierId}:${type}:${sequence}`;
    const createEvent = (
      sequence: number,
      type: string,
      status: PipelineEvent["status"],
      message: string,
      subjectId: string | undefined,
      layer: MapLayer,
      runStatus: PipelineRunStatus,
    ): PipelineEvent => ({
      id: eventId(type, sequence),
      dossierId: input.dossierId,
      stage: "profiles",
      type,
      timestamp: timestampFor(sequence),
      status,
      message,
      subjectId,
      payload: createPayload(layer, runStatus),
    });

    let sequence = 0;
    let layer = createInitialLayer(input.dossierId, input.subEntityLayer);

    yield createEvent(
      sequence++,
      "profile_build.started",
      "running",
      "Demo profile consolidation started from sub-entities.",
      undefined,
      layer,
      "running",
    );

    for (const definition of profileDefinitions) {
      const lineageNodes = findLineageNodes(
        input.subEntityLayer,
        definition.lineageTitles,
      );
      const profileNode = createProfileNode(
        layer.id,
        definition,
        lineageNodes,
        eventId("profile_build.profile_created", sequence),
      );
      const nextLayer = {
        ...layer,
        nodes: [...layer.nodes, profileNode],
      };

      layer = {
        ...nextLayer,
        edges: [...nextLayer.edges, ...connectAvailableProfiles(nextLayer)],
      };

      yield createEvent(
        sequence++,
        "profile_build.profile_created",
        "completed",
        `Demo consolidated ${definition.title} from ${lineageNodes.length} contributing sub-entities.`,
        profileNode.id,
        layer,
        "running",
      );
    }

    yield createEvent(
      sequence,
      "profile_build.completed",
      "completed",
      "Demo profile consolidation completed.",
      undefined,
      layer,
      "completed",
    );
  }
}
