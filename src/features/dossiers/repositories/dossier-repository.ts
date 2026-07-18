import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import type { Dossier } from "../domain/contracts";
import type { DossierServerConfig } from "../config/server";
import { readDossierServerConfig } from "../config/server";
import { assertSafeIdentifier } from "../storage/source-file-storage";

export interface DossierRepository {
  create(dossier: Dossier): Promise<void>;
  getById(dossierId: string): Promise<Dossier | null>;
  save(dossier: Dossier): Promise<void>;
}

const dossierSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["created", "uploaded", "partially_uploaded", "failed"]),
  files: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    dossierId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    originalName: z.string(),
    storedName: z.string(),
    extension: z.enum(["pdf", "csv", "txt", "xlsx", "xml", "docx"]),
    mimeType: z.string(),
    sizeBytes: z.number().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    uploadedAt: z.string(),
    status: z.enum(["stored", "rejected", "failed"]),
    rejectionReason: z.string().optional(),
  })),
});

function storageRoot(config: DossierServerConfig) {
  return resolve(/* turbopackIgnore: true */ process.cwd(), config.dossierStorageRoot);
}

function manifestPath(config: DossierServerConfig, dossierId: string) {
  assertSafeIdentifier(dossierId, "dossier identifier");

  return join(storageRoot(config), dossierId, "manifest.json");
}

async function writeJsonAtomic(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, path);
}

export function createFilesystemDossierRepository(
  config: DossierServerConfig = readDossierServerConfig(),
): DossierRepository {
  return {
    async create(dossier) {
      await writeJsonAtomic(manifestPath(config, dossier.id), dossier);
    },

    async getById(dossierId) {
      try {
        const parsed = JSON.parse(await readFile(manifestPath(config, dossierId), "utf8"));
        const validated = dossierSchema.safeParse(parsed);

        return validated.success ? validated.data : null;
      } catch {
        return null;
      }
    },

    async save(dossier) {
      await writeJsonAtomic(manifestPath(config, dossier.id), dossier);
    },
  };
}
