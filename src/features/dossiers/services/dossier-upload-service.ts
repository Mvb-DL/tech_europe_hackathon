import { createHash, randomUUID } from "node:crypto";
import type { Dossier, SourceFile, SupportedFileExtension, UploadDossierResponse } from "../domain/contracts";
import type { DossierServerConfig } from "../config/server";
import { readDossierServerConfig } from "../config/server";
import type { DossierRepository } from "../repositories/dossier-repository";
import { createFilesystemDossierRepository } from "../repositories/dossier-repository";
import type { SourceFileStorage } from "../storage/source-file-storage";
import { createLocalSourceFileStorage, sanitizeFilename } from "../storage/source-file-storage";

export type UploadableFile = {
  arrayBuffer(): Promise<ArrayBuffer>;
  originalName?: string;
  relativePath?: string;
  name: string;
  size: number;
  type?: string;
};

type UploadDossierInput = {
  files: UploadableFile[];
  name?: string;
};

type UploadDossierOptions = {
  config?: DossierServerConfig;
  repository?: DossierRepository;
  storage?: SourceFileStorage;
};

export class PublicUploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

const supportedExtensions = new Set<SupportedFileExtension>([
  "pdf",
  "csv",
  "txt",
  "xlsx",
  "xml",
  "docx",
]);

function createIdentifier(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function extensionOf(filename: string): SupportedFileExtension | null {
  const extension = filename.split(".").at(-1)?.toLowerCase();

  return extension && supportedExtensions.has(extension as SupportedFileExtension)
    ? extension as SupportedFileExtension
    : null;
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sanitizeRelativePath(value: string) {
  return value
    .split(/[\\/]+/)
    .map((part) => sanitizeFilename(part))
    .filter(Boolean)
    .join("/");
}

function dossierStatus(acceptedCount: number, rejectedCount: number): Dossier["status"] {
  if (acceptedCount === 0) {
    return "failed";
  }

  return rejectedCount > 0 ? "partially_uploaded" : "uploaded";
}

function reject(
  rejectedFiles: UploadDossierResponse["rejectedFiles"],
  originalName: string,
  reason: string,
) {
  rejectedFiles.push({
    originalName: sanitizeFilename(originalName || "unnamed-file"),
    reason,
  });
}

export async function uploadDossier(
  input: UploadDossierInput,
  options: UploadDossierOptions = {},
): Promise<UploadDossierResponse> {
  const config = options.config ?? readDossierServerConfig();
  const repository = options.repository ?? createFilesystemDossierRepository(config);
  const storage = options.storage ?? createLocalSourceFileStorage(config);

  if (input.files.length === 0) {
    throw new PublicUploadError("No files selected.");
  }

  const now = new Date().toISOString();
  const dossierId = createIdentifier("dossier");
  const acceptedFiles: SourceFile[] = [];
  const acceptedFileIds: string[] = [];
  const rejectedFiles: UploadDossierResponse["rejectedFiles"] = [];
  const seenHashes = new Set<string>();
  let acceptedBytes = 0;

  for (const [index, file] of input.files.entries()) {
    const rawName = file.originalName || file.relativePath || file.name || "unnamed-file";
    const originalName = sanitizeFilename(rawName);
    const relativePath = file.relativePath
      ? sanitizeRelativePath(file.relativePath)
      : undefined;

    if (index >= config.maxFilesPerDossier) {
      reject(rejectedFiles, originalName, `Maximum file count is ${config.maxFilesPerDossier}.`);
      continue;
    }

    const extension = extensionOf(originalName);

    if (!extension) {
      reject(rejectedFiles, originalName, "Unsupported file extension.");
      continue;
    }

    if (file.size <= 0) {
      reject(rejectedFiles, originalName, "File is empty.");
      continue;
    }

    if (file.size > config.maxFileSizeBytes) {
      reject(rejectedFiles, originalName, "File exceeds the maximum size.");
      continue;
    }

    if (acceptedBytes + file.size > config.maxTotalUploadBytes) {
      reject(rejectedFiles, originalName, "Upload exceeds the maximum total size.");
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const digest = sha256(bytes);

    if (seenHashes.has(digest)) {
      reject(rejectedFiles, originalName, "Duplicate file content.");
      continue;
    }

    const fileId = createIdentifier("file");

    try {
      const stored = await storage.save({
        bytes,
        dossierId,
        fileId,
        originalName,
      });

      acceptedBytes += file.size;
      seenHashes.add(digest);
      acceptedFileIds.push(fileId);
      acceptedFiles.push({
        dossierId,
        extension,
        id: fileId,
        mimeType: file.type || "application/octet-stream",
        originalName,
        relativePath,
        sha256: digest,
        sizeBytes: bytes.byteLength,
        status: "stored",
        storedName: stored.storedName,
        uploadedAt: now,
      });
    } catch {
      reject(rejectedFiles, originalName, "File could not be stored.");
    }
  }

  const dossier: Dossier = {
    createdAt: now,
    files: acceptedFiles,
    id: dossierId,
    name: input.name?.trim() || "Untitled audit dossier",
    status: dossierStatus(acceptedFiles.length, rejectedFiles.length),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(dossier);

  return {
    acceptedFileIds,
    dossier,
    rejectedFiles,
  };
}
