import type { SourceReference } from "@/lib/domain";
import type { FileFingerprint, FileMappingResult, MappingReason } from "../domain/contracts";
import { fileMappingRules } from "./mapping-rules";

function normalize(value: string) { return value.toLocaleLowerCase("de-DE").replaceAll(/[^a-z0-9äöüß]/g, ""); }
function source(fingerprint: FileFingerprint): SourceReference { return { fileId: fingerprint.fileId, filename: fingerprint.filename }; }
function matchesPattern(patterns: RegExp[] | undefined, values: string[]) { return Boolean(patterns?.some((pattern) => values.some((value) => pattern.test(value)))); }
function unknown(fingerprint: FileFingerprint, warnings: string[] = []): FileMappingResult {
  return { fileId: fingerprint.fileId, primaryDomain: "unknown", documentRole: "unknown", secondaryDomains: [], documentType: "Unknown", entityCandidates: [], primaryKeyCandidates: [], joinKeyCandidates: [], reportingPeriods: fingerprint.reportingPeriodCandidates, languages: fingerprint.languageCandidates, confidence: 0.2, method: "unknown", reasons: [{ signal: "insufficient_observed_signals", explanation: "Observed signals did not match a deterministic mapping rule.", sourceRefs: [source(fingerprint)] }], warnings };
}
export function classifyWithRules(fingerprint: FileFingerprint): FileMappingResult {
  const headers = fingerprint.headers.map(normalize); const text = [fingerprint.filename, ...fingerprint.titleCandidates, fingerprint.textSample ?? ""].join(" ");
  const candidates = fileMappingRules.map((rule) => {
    const required = rule.requiredHeaders?.every((header) => headers.includes(normalize(header))) ?? true;
    const any = rule.anyHeaders?.some((header) => headers.includes(normalize(header)) || text.toLowerCase().includes(header.toLowerCase())) ?? false;
    const named = matchesPattern(rule.sheetPatterns, fingerprint.sheetNames) || matchesPattern(rule.titlePatterns, fingerprint.titleCandidates) || matchesPattern(rule.textPatterns, [fingerprint.textSample ?? ""]);
    const filename = matchesPattern(rule.filenamePatterns, [fingerprint.filename]);
    if (!required || (!rule.requiredHeaders?.length && !any && !named && !filename)) return undefined;
    const filenameOnly = filename && !any && !named && !rule.requiredHeaders?.length;
    const confidence = filenameOnly ? Math.min(rule.confidence, 0.6) : rule.confidence;
    const reasons: MappingReason[] = [{ signal: required && rule.requiredHeaders?.length ? rule.requiredHeaders.join(", ") : named ? "title_or_content_marker" : "filename", explanation: rule.explanation, sourceRefs: [source(fingerprint)], weight: confidence }];
    return { rule, confidence, reasons };
  }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)).sort((left, right) => right.confidence - left.confidence);
  const best = candidates[0]; if (!best) return unknown(fingerprint, fingerprint.extractionWarnings);
  return { fileId: fingerprint.fileId, primaryDomain: best.rule.primaryDomain, documentRole: best.rule.documentRole, secondaryDomains: [], documentType: best.rule.id, entityCandidates: best.rule.entityCandidates ?? [], primaryKeyCandidates: best.rule.primaryKeyCandidates ?? [], joinKeyCandidates: best.rule.joinKeyCandidates ?? [], reportingPeriods: fingerprint.reportingPeriodCandidates, languages: fingerprint.languageCandidates, confidence: best.confidence, method: "rules", reasons: best.reasons, warnings: fingerprint.extractionWarnings };
}
