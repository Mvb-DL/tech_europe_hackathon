"use client";

import { create } from "zustand";
import type {
  MapLayer,
  PipelineEvent,
  PipelineRunStatus,
  PipelineStage,
  UploadedFile,
} from "./contracts";
import { reducePipelineEvent, upsertMapLayer } from "./reducer";

export type PipelineStoreState = {
  dossierId: string | null;
  uploadedFiles: UploadedFile[];
  processingQueue: string[];
  events: PipelineEvent[];
  mapLayers: MapLayer[];
  runStatus: PipelineRunStatus;
  activeStage: PipelineStage;
  selectedNodeId: string | null;
  playbackSpeed: number;
};

export type PipelineStoreActions = {
  setDossierId: (dossierId: string | null) => void;
  setUploadedFiles: (uploadedFiles: UploadedFile[]) => void;
  setProcessingQueue: (processingQueue: string[]) => void;
  applyPipelineEvent: (event: PipelineEvent) => void;
  setMapLayers: (mapLayers: MapLayer[]) => void;
  upsertMapLayer: (mapLayer: MapLayer) => void;
  setRunStatus: (runStatus: PipelineRunStatus) => void;
  setActiveStage: (activeStage: PipelineStage) => void;
  setSelectedNodeId: (selectedNodeId: string | null) => void;
  setPlaybackSpeed: (playbackSpeed: number) => void;
  resetPipelineRun: () => void;
  resetStageRun: (stage: PipelineStage) => void;
  reset: () => void;
};

export type PipelineStore = PipelineStoreState & PipelineStoreActions;

const createInitialPipelineState = (): PipelineStoreState => ({
  dossierId: null,
  uploadedFiles: [],
  processingQueue: [],
  events: [],
  mapLayers: [],
  runStatus: "idle",
  activeStage: "upload",
  selectedNodeId: null,
  playbackSpeed: 1,
});

export const usePipelineStore = create<PipelineStore>()((set) => ({
  ...createInitialPipelineState(),
  setDossierId: (dossierId) => set({ dossierId }),
  setUploadedFiles: (uploadedFiles) => set({ uploadedFiles }),
  setProcessingQueue: (processingQueue) => set({ processingQueue }),
  applyPipelineEvent: (event) =>
    set((state) => reducePipelineEvent(state, event)),
  setMapLayers: (mapLayers) => set({ mapLayers }),
  upsertMapLayer: (mapLayer) =>
    set((state) => ({
      mapLayers: upsertMapLayer(state.mapLayers, mapLayer),
    })),
  setRunStatus: (runStatus) => set({ runStatus }),
  setActiveStage: (activeStage) => set({ activeStage }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  resetPipelineRun: () =>
    set({
      processingQueue: [],
      events: [],
      mapLayers: [],
      runStatus: "idle",
      selectedNodeId: null,
    }),
  resetStageRun: (stage) =>
    set((state) => ({
      events: state.events.filter((event) => event.stage !== stage),
      mapLayers: state.mapLayers.filter((layer) => layer.stage !== stage),
      runStatus: "idle",
      selectedNodeId: null,
    })),
  reset: () => set(createInitialPipelineState()),
}));
