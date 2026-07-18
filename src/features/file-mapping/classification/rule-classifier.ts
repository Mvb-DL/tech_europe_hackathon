import type { SourceReference } from "@/lib/domain";
import type { FileFingerprint, FileMappingResult, MappingReason } from "../domain/contracts";
import { fileMappingRules } from "./mapping-rules";

function normalize(value: string) { return value.toLocaleLowerCase("de-DE").replaceAll(/[^a-z0-9äöüß]/g, ""); }
function source(fingerprint: FileFingerprint): SourceReference { return { fileId: fingerprint.fileId, filename: fingerprint.filename }; }
function matchesPattern(patterns: RegExp[] | undefined, values: string[]) { return Boolean(patterns?.some((pattern) => values.some((value) => pattern.test(value)))); }
function slug(value: string) { return normalize(value).slice(0, 48) || "unclassified"; }
function titleCase(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("de-DE") + part.slice(1))
    .join(" ");
}
function dynamicGroupLabel(fingerprint: FileFingerprint) {
  const parts = fingerprint.filename.split(/[\\/]/).filter(Boolean);
  const folder = parts.length > 1 ? parts.at(-2) : undefined;
  const basename = parts.at(-1) ?? fingerprint.filename;
  const title = titleCase(basename);

  if (folder && !/begleitdokumente/i.test(folder)) {
    return `${titleCase(folder)} · ${title}`;
  }

  if (fingerprint.sheetNames[0]) {
    return titleCase(fingerprint.sheetNames[0]);
  }

  if (fingerprint.titleCandidates[0]) {
    return titleCase(fingerprint.titleCandidates[0]).slice(0, 60);
  }

  return title || "Unclassified documents";
}
function unknown(fingerprint: FileFingerprint, warnings: string[] = []): FileMappingResult {
  return { fileId: fingerprint.fileId, primaryDomain: "unknown", documentRole: "unknown", secondaryDomains: [], documentType: "Unknown", entityCandidates: [], primaryKeyCandidates: [], joinKeyCandidates: [], reportingPeriods: fingerprint.reportingPeriodCandidates, languages: fingerprint.languageCandidates, confidence: 0.2, method: "unknown", reasons: [{ signal: "insufficient_observed_signals", explanation: "Observed signals did not match a deterministic mapping rule.", sourceRefs: [source(fingerprint)] }], warnings };
}
export function createDynamicGroupResult(fingerprint: FileFingerprint): FileMappingResult {
  const label = dynamicGroupLabel(fingerprint);

  return {
    fileId: fingerprint.fileId,
    primaryDomain: "unknown",
    documentRole: "supporting_document",
    secondaryDomains: [],
    documentType: "dynamic-file-group",
    entityCandidates: [],
    primaryKeyCandidates: [],
    joinKeyCandidates: fingerprint.headers.slice(0, 5),
    reportingPeriods: fingerprint.reportingPeriodCandidates,
    languages: fingerprint.languageCandidates,
    confidence: 0.68,
    method: "rules",
    groupId: `custom:${slug(label)}`,
    groupLabel: label,
    groupReason: "No closed-taxonomy domain matched; grouped by observed filename, folder, title, or sheet signal.",
    reasons: [{
      signal: fingerprint.sheetNames[0] ?? fingerprint.titleCandidates[0] ?? fingerprint.filename,
      explanation: "Created a dynamic reviewable group from observed file metadata because no fixed audit-domain rule matched.",
      sourceRefs: [source(fingerprint)],
      weight: 0.68,
    }],
    warnings: [
      ...fingerprint.extractionWarnings,
      "No fixed audit-domain rule matched; dynamic group requires review before treating it as a factual classification.",
    ],
  };
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
    const confidence = filenameOnly && !rule.trustFilenameOnly
      ? Math.min(rule.confidence, 0.6)
      : rule.confidence;
    const reasons: MappingReason[] = [{ signal: required && rule.requiredHeaders?.length ? rule.requiredHeaders.join(", ") : named ? "title_or_content_marker" : "filename", explanation: rule.explanation, sourceRefs: [source(fingerprint)], weight: confidence }];
    return { rule, confidence, reasons };
  }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate)).sort((left, right) => right.confidence - left.confidence);
  const best = candidates[0]; if (!best) return unknown(fingerprint, fingerprint.extractionWarnings);
  return { fileId: fingerprint.fileId, primaryDomain: best.rule.primaryDomain, documentRole: best.rule.documentRole, secondaryDomains: [], documentType: best.rule.id, entityCandidates: best.rule.entityCandidates ?? [], primaryKeyCandidates: best.rule.primaryKeyCandidates ?? [], joinKeyCandidates: best.rule.joinKeyCandidates ?? [], reportingPeriods: fingerprint.reportingPeriodCandidates, languages: fingerprint.languageCandidates, confidence: best.confidence, method: "rules", reasons: best.reasons, warnings: fingerprint.extractionWarnings };
}
