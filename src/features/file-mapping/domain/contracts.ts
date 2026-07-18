import type { SourceReference } from "@/lib/domain";
import type { DocumentRole, PrimaryDomain } from "./taxonomy";

export type FileFingerprint = {
  fileId: string; filename: string; extension: string; mimeType: string; sizeBytes: number;
  sha256?: string; encoding?: string; delimiter?: string; languageCandidates: string[];
  reportingPeriodCandidates: string[]; sheetNames: string[]; tableNames: string[];
  headers: string[]; titleCandidates: string[]; sampleRows: Array<Record<string, unknown>>;
  textSample?: string; xmlRoot?: string; referencedFiles: string[]; rowCount?: number;
  pageCount?: number; extractionWarnings: string[];
};

export type FileMappingMethod = "manifest" | "rules" | "agent" | "human" | "unknown";
export type MappingReason = { signal: string; explanation: string; sourceRefs: SourceReference[]; weight?: number };
export type FileMappingResult = {
  fileId: string; primaryDomain: PrimaryDomain; documentRole: DocumentRole;
  secondaryDomains: PrimaryDomain[]; documentType: string; entityCandidates: string[];
  primaryKeyCandidates: string[]; joinKeyCandidates: string[]; reportingPeriods: string[];
  languages: string[]; confidence: number; method: FileMappingMethod; reasons: MappingReason[];
  warnings: string[]; groupId?: string; groupLabel?: string; groupReason?: string;
};
export type FileConnection = {
  id: string; sourceFileId: string; targetFileId: string;
  relationship: "references" | "defines_schema_for" | "shares_key_with" | "reconciles_with" | "supports" | "candidate_connection";
  sharedFields: string[]; confidence: number; status: "confirmed" | "candidate"; reasons: MappingReason[];
};
export type FileMapGroup = { id: string; domain: PrimaryDomain | "custom"; label: string; fileIds: string[]; reason?: string };
export type FileMap = {
  dossierId: string; createdAt: string; updatedAt: string; files: FileMappingResult[];
  groups: FileMapGroup[]; connections: FileConnection[];
  summary: { totalFiles: number; mappedFiles: number; unknownFiles: number; agentClassifiedFiles: number; reviewRequiredFiles: number };
};
export type FileMappingEvent = {
  type: string; dossierId: string; fileId?: string; timestamp: string;
  message: string; payload?: Record<string, unknown>;
};
export interface FileClassificationAgent { classify(fingerprints: FileFingerprint[]): Promise<FileMappingResult[]>; }
export interface FileMapProvider {
  mapDossier(dossierId: string): Promise<{ fileMap: FileMap; events: FileMappingEvent[] }>;
  getFileMap(dossierId: string): Promise<FileMap | null>;
}
