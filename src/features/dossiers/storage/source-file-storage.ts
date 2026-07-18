import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { DossierServerConfig } from "../config/server";
import { readDossierServerConfig } from "../config/server";

export interface SourceFileStorage {
  save(input: {
    dossierId: string;
    fileId: string;
    originalName: string;
    bytes: Uint8Array;
  }): Promise<{
    storedName: string;
  }>;

  read(input: {
    dossierId: string;
    fileId: string;
  }): Promise<Uint8Array>;

  exists(input: {
    dossierId: string;
    fileId: string;
  }): Promise<boolean>;
}

const safeIdPattern = /^[a-zA-Z0-9_-]+$/;

export function assertSafeIdentifier(value: string, label: string) {
  if (!safeIdPattern.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
}

export function sanitizeFilename(value: string) {
  const basenameOnly = basename(value.replaceAll("\\", "/"));
  const sanitized = basenameOnly
    .normalize("NFKD")
    .replaceAll(/[^\w.() -]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^\.+/g, "")
    .trim()
    .slice(0, 120);

  return sanitized || "source-file";
}

function storageRoot(config: DossierServerConfig) {
  return resolve(/* turbopackIgnore: true */ process.cwd(), config.dossierStorageRoot);
}

function dossierFilesDirectory(config: DossierServerConfig, dossierId: string) {
  assertSafeIdentifier(dossierId, "dossier identifier");

  return join(storageRoot(config), dossierId, "files");
}

async function findStoredName(config: DossierServerConfig, input: {
  dossierId: string;
  fileId: string;
}) {
  assertSafeIdentifier(input.fileId, "file identifier");
  const directory = dossierFilesDirectory(config, input.dossierId);
  const prefix = `${input.fileId}-`;
  const entries = await readdir(directory);

  return entries.find((entry) => entry.startsWith(prefix));
}

export function createLocalSourceFileStorage(
  config: DossierServerConfig = readDossierServerConfig(),
): SourceFileStorage {
  return {
    async save(input) {
      assertSafeIdentifier(input.dossierId, "dossier identifier");
      assertSafeIdentifier(input.fileId, "file identifier");
      const directory = dossierFilesDirectory(config, input.dossierId);
      const storedName = `${input.fileId}-${sanitizeFilename(input.originalName)}`;

      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, storedName), input.bytes);

      return { storedName };
    },

    async read(input) {
      const storedName = await findStoredName(config, input);

      if (!storedName) {
        throw new Error("Source file not found.");
      }

      return readFile(join(dossierFilesDirectory(config, input.dossierId), storedName));
    },

    async exists(input) {
      try {
        return Boolean(await findStoredName(config, input));
      } catch {
        return false;
      }
    },
  };
}
