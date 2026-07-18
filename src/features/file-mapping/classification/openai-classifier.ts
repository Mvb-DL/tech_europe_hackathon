import OpenAI from "openai";
import type { FileClassificationAgent, FileFingerprint } from "../domain/contracts";
import { validateAgentResult } from "./validate-agent-result";

const schema = { type: "object", additionalProperties: false, required: ["results"], properties: { results: { type: "array", items: { type: "object", additionalProperties: false, required: ["fileId", "primaryDomain", "documentRole", "secondaryDomains", "documentType", "entityCandidates", "primaryKeyCandidates", "joinKeyCandidates", "reportingPeriods", "languages", "confidence", "method", "reasons", "warnings"], properties: { fileId: { type: "string" }, primaryDomain: { type: "string" }, documentRole: { type: "string" }, secondaryDomains: { type: "array", items: { type: "string" } }, documentType: { type: "string" }, entityCandidates: { type: "array", items: { type: "string" } }, primaryKeyCandidates: { type: "array", items: { type: "string" } }, joinKeyCandidates: { type: "array", items: { type: "string" } }, reportingPeriods: { type: "array", items: { type: "string" } }, languages: { type: "array", items: { type: "string" } }, confidence: { type: "number" }, method: { type: "string", enum: ["agent"] }, reasons: { type: "array", items: { type: "object", additionalProperties: false, required: ["signal", "explanation", "sourceRefs"], properties: { signal: { type: "string" }, explanation: { type: "string" }, sourceRefs: { type: "array", items: { type: "object", additionalProperties: false, required: ["fileId", "filename"], properties: { fileId: { type: "string" }, filename: { type: "string" } } } } } } }, warnings: { type: "array", items: { type: "string" } } } } } } } as const;

function compact(fingerprint: FileFingerprint) {
  const { fileId, filename, extension, mimeType, headers, sheetNames, titleCandidates, sampleRows, textSample, xmlRoot, referencedFiles, reportingPeriodCandidates, languageCandidates } = fingerprint;
  return { fileId, filename, extension, mimeType, headers, sheetNames, titleCandidates, sampleRows: sampleRows.slice(0, 3), textSample: textSample?.slice(0, 1000), xmlRoot, referencedFiles, reportingPeriodCandidates, languageCandidates };
}

export function createOpenAiClassificationAgent(): FileClassificationAgent | null {
  const key = process.env.AGENT_API_KEY;
  if (!key || process.env.FILE_MAPPING_AGENT_ENABLED === "false") return null;
  const client = new OpenAI({ apiKey: process.env.AGENT_API_KEY, timeout: 12_000 });
  return { async classify(fingerprints) {
    const response = await client.responses.create({ model: process.env.AGENT_MODEL || "gpt-5", store: false,
      instructions: "Classify business and audit files only from supplied fingerprints and the closed taxonomy. Do not investigate fraud, extract transactions, or invent signals. Every reason.signal must be an exact observed header, sheet, title, filename, extension, or referenced filename. Filename evidence is supporting only. Return unknown when insufficient.",
      input: JSON.stringify({ taxonomy: { primaryDomains: ["general_ledger", "accounts_payable", "accounts_receivable", "fixed_assets", "controls_permissions", "financial_reporting", "audit_planning", "corporate_structure", "cross_domain_metadata", "supporting_documents", "unknown"], documentRoles: ["master_data", "transactions", "reconciliation", "financial_report", "control_evidence", "schema_manifest", "export_manifest", "audit_plan", "supporting_document", "unknown"] }, fingerprints: fingerprints.map(compact) }),
      text: { format: { type: "json_schema", name: "file_mapping_results", strict: true, schema } } });
    const parsed = JSON.parse(response.output_text) as { results?: unknown[] };
    return fingerprints.flatMap((fingerprint, index) => { const result = validateAgentResult(parsed.results?.[index], fingerprint); return result ? [result] : []; });
  } };
}
