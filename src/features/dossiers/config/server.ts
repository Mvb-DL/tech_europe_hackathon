export type DossierServerConfig = {
  dossierStorageRoot: string;
  maxFilesPerDossier: number;
  maxFileSizeBytes: number;
  maxTotalUploadBytes: number;
};

function readPositiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function readDossierServerConfig(): DossierServerConfig {
  const maxFileSizeMb = readPositiveNumber("MAX_FILE_SIZE_MB", 50);
  const maxTotalUploadMb = readPositiveNumber("MAX_TOTAL_UPLOAD_MB", 500);

  return {
    dossierStorageRoot: process.env.DOSSIER_STORAGE_ROOT || "./data/dossiers",
    maxFilesPerDossier: Math.floor(
      readPositiveNumber("MAX_FILES_PER_DOSSIER", 50),
    ),
    maxFileSizeBytes: Math.floor(maxFileSizeMb * 1024 * 1024),
    maxTotalUploadBytes: Math.floor(maxTotalUploadMb * 1024 * 1024),
  };
}
