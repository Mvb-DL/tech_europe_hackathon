import { z } from "zod";
import type { FileFingerprint, FileMappingResult } from "../domain/contracts";
import { documentRoles, primaryDomains } from "../domain/taxonomy";

const schema = z.object({ fileId: z.string(), primaryDomain: z.enum(primaryDomains), documentRole: z.enum(documentRoles), secondaryDomains: z.array(z.enum(primaryDomains)).default([]), documentType: z.string(), entityCandidates: z.array(z.string()).default([]), primaryKeyCandidates: z.array(z.string()).default([]), joinKeyCandidates: z.array(z.string()).default([]), reportingPeriods: z.array(z.string()).default([]), languages: z.array(z.string()).default([]), confidence: z.number().min(0).max(1), method: z.literal("agent"), reasons: z.array(z.object({ signal: z.string().min(1), explanation: z.string().min(1), sourceRefs: z.array(z.object({ fileId: z.string(), filename: z.string(), sheet: z.string().optional(), page: z.number().optional(), row: z.number().optional(), column: z.string().optional(), passage: z.string().optional() })) })).min(1), warnings: z.array(z.string()).default([]) });
export function validateAgentResult(value: unknown, fingerprint: FileFingerprint): FileMappingResult | null {
  const parsed = schema.safeParse(value); if (!parsed.success || parsed.data.fileId !== fingerprint.fileId) return null;
  const observed = [fingerprint.filename, fingerprint.extension, ...fingerprint.headers, ...fingerprint.sheetNames, ...fingerprint.titleCandidates, ...fingerprint.referencedFiles].map((item) => item.toLowerCase());
  if (!parsed.data.reasons.every((reason) => observed.some((item) => item.includes(reason.signal.toLowerCase()) || reason.signal.toLowerCase().includes(item)))) return null;
  return parsed.data;
}
