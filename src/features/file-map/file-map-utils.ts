import type {
  MapLayer,
  PipelineEvent,
  UploadedFile,
} from "@/lib/pipeline/contracts";

export type FileMapStatus =
  | "queued"
  | "reading"
  | "classified"
  | "placed"
  | "failed";

export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getLatestFileEvent(events: PipelineEvent[]) {
  return [...events]
    .reverse()
    .find((event) => event.stage === "files" && event.subjectId);
}

export function getFileMapStatus(
  event: PipelineEvent | undefined,
): FileMapStatus {
  if (!event) {
    return "queued";
  }

  if (event.type.endsWith("file_failed")) {
    return "failed";
  }

  if (event.type.endsWith("file_placed")) {
    return "placed";
  }

  if (event.type.endsWith("file_classified")) {
    return "classified";
  }

  return "reading";
}

export function getPlacedFileIds(layer: MapLayer | undefined) {
  return new Set(
    layer?.nodes
      .filter((node) => node.kind === "file")
      .flatMap((node) => node.sourceIds) ?? [],
  );
}

export function getFailedFileIds(events: PipelineEvent[]) {
  return new Set(
    events
      .filter(
        (event) =>
          event.stage === "files" &&
          event.status === "failed" &&
          Boolean(event.subjectId),
      )
      .flatMap((event) => (event.subjectId ? [event.subjectId] : [])),
  );
}

export function getUploadedFile(
  files: UploadedFile[],
  fileId: string | undefined,
) {
  return files.find((file) => file.id === fileId);
}
