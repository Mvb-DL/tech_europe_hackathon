"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { PipelineRuntimeProvider } from "@/features/pipeline/pipeline-runtime-provider";
import { DemoEntityExtractionEngine } from "./engines/demo-entity-extraction-engine";
import { DemoEntityLayoutEngine } from "./engines/demo-entity-layout-engine";
import { DemoFileMapLayoutEngine } from "./engines/demo-file-map-layout-engine";
import { DemoFileMappingEngine } from "./engines/demo-file-mapping-engine";

type DemoPipelineProviderProps = {
  children: ReactNode;
};

export function DemoPipelineProvider({
  children,
}: DemoPipelineProviderProps) {
  const entityExtractionEngine = useMemo(
    () => new DemoEntityExtractionEngine(),
    [],
  );
  const entityLayoutEngine = useMemo(() => new DemoEntityLayoutEngine(), []);
  const fileMappingEngine = useMemo(() => new DemoFileMappingEngine(), []);
  const graphLayoutEngine = useMemo(() => new DemoFileMapLayoutEngine(), []);

  return (
    <PipelineRuntimeProvider
      entityExtractionEngine={entityExtractionEngine}
      entityLayoutEngine={entityLayoutEngine}
      fileMappingEngine={fileMappingEngine}
      graphLayoutEngine={graphLayoutEngine}
    >
      {children}
    </PipelineRuntimeProvider>
  );
}
