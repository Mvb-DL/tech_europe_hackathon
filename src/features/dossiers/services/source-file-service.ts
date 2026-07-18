import type { SourceFile } from "../domain/contracts";
import type { DossierServerConfig } from "../config/server";
import { readDossierServerConfig } from "../config/server";
import { createFilesystemDossierRepository } from "../repositories/dossier-repository";
import { createLocalSourceFileStorage, assertSafeIdentifier } from "../storage/source-file-storage";

export async function getSourceFile(input: {
  dossierId: string;
  fileId: string;
}, config: DossierServerConfig = readDossierServerConfig()): Promise<{
  metadata: SourceFile;
  bytes: Uint8Array;
}> {
  assertSafeIdentifier(input.dossierId, "dossier identifier");
  assertSafeIdentifier(input.fileId, "file identifier");
  const repository = createFilesystemDossierRepository(config);
  const storage = createLocalSourceFileStorage(config);
  const dossier = await repository.getById(input.dossierId);
  const metadata = dossier?.files.find((file) => file.id === input.fileId);

  if (!metadata) {
    throw new Error("Source file not found.");
  }

  return {
    bytes: await storage.read(input),
    metadata,
  };
}
