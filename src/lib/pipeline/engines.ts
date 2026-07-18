import type { MapLayer, PipelineEvent, UploadedFile } from "./contracts";

export interface FileMappingEngine {
  run(input: {
    dossierId: string;
    files: UploadedFile[];
  }): AsyncIterable<PipelineEvent>;
}

export interface EntityExtractionEngine {
  run(input: {
    dossierId: string;
    fileLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface SubEntityEngine {
  run(input: {
    dossierId: string;
    entityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface ProfileEngine {
  run(input: {
    dossierId: string;
    subEntityLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}

export interface EnrichmentEngine {
  run(input: {
    dossierId: string;
    profileLayer: MapLayer;
  }): AsyncIterable<PipelineEvent>;
}
