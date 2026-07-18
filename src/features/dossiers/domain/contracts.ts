export type DossierStatus =
  | "created"
  | "uploaded"
  | "partially_uploaded"
  | "failed";

export type SourceFileStatus =
  | "stored"
  | "rejected"
  | "failed";

export type SupportedFileExtension =
  | "pdf"
  | "csv"
  | "txt"
  | "xlsx"
  | "xml"
  | "docx";

export type SourceFile = {
  id: string;
  dossierId: string;
  originalName: string;
  storedName: string;
  extension: SupportedFileExtension;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  status: SourceFileStatus;
  rejectionReason?: string;
};

export type Dossier = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: DossierStatus;
  files: SourceFile[];
};

export type UploadDossierResponse = {
  dossier: Dossier;
  acceptedFileIds: string[];
  rejectedFiles: Array<{
    originalName: string;
    reason: string;
  }>;
};

export type SourceReference = {
  dossierId: string;
  fileId: string;
  filename: string;
  sha256: string;
  sheet?: string;
  page?: number;
  row?: number;
  column?: string;
  passage?: string;
};
