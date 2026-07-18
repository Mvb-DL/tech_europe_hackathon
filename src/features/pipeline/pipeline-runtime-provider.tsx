"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type {
  EntityExtractionEngine,
  FileMappingEngine,
  ProfileEngine,
  SubEntityEngine,
} from "@/lib/pipeline/engines";
import type { GraphLayoutEngine } from "@/lib/pipeline/layout";

type PipelineRuntime = {
  entityExtractionEngine: EntityExtractionEngine;
  entityLayoutEngine: GraphLayoutEngine;
  fileMappingEngine: FileMappingEngine;
  graphLayoutEngine: GraphLayoutEngine;
  profileEngine: ProfileEngine;
  profileLayoutEngine: GraphLayoutEngine;
  subEntityEngine: SubEntityEngine;
  subEntityLayoutEngine: GraphLayoutEngine;
};

const PipelineRuntimeContext = createContext<PipelineRuntime | null>(null);

type PipelineRuntimeProviderProps = PipelineRuntime & {
  children: ReactNode;
};

export function PipelineRuntimeProvider({
  children,
  entityExtractionEngine,
  entityLayoutEngine,
  fileMappingEngine,
  graphLayoutEngine,
  profileEngine,
  profileLayoutEngine,
  subEntityEngine,
  subEntityLayoutEngine,
}: PipelineRuntimeProviderProps) {
  return (
    <PipelineRuntimeContext.Provider
      value={{
        entityExtractionEngine,
        entityLayoutEngine,
        fileMappingEngine,
        graphLayoutEngine,
        profileEngine,
        profileLayoutEngine,
        subEntityEngine,
        subEntityLayoutEngine,
      }}
    >
      {children}
    </PipelineRuntimeContext.Provider>
  );
}

export function usePipelineRuntime() {
  const runtime = useContext(PipelineRuntimeContext);

  if (!runtime) {
    throw new Error("Pipeline runtime is not configured.");
  }

  return runtime;
}
