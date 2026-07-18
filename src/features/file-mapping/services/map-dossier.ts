import { domainLabels } from "../domain/taxonomy";
import type { FileClassificationAgent, FileFingerprint, FileMap, FileMappingEvent } from "../domain/contracts";
import { classifyWithRules } from "../classification/rule-classifier";
import { createOpenAiClassificationAgent } from "../classification/openai-classifier";
import { discoverFileConnections } from "../connections/discover-file-connections";
import { createFileFingerprint } from "../fingerprint/create-file-fingerprint";
import { getManifest, readStoredFile, saveMapping } from "../repositories/file-map-repository";

const stamp = () => new Date().toISOString();
export async function mapDossier(dossierId: string, agent: FileClassificationAgent | null = createOpenAiClassificationAgent()) {
  const manifest = await getManifest(dossierId); if (!manifest) throw new Error("Dossier not found."); const events: FileMappingEvent[] = [];
  const event = (type: string, message: string, fileId?: string, payload?: Record<string, unknown>) => events.push({ type, dossierId, fileId, timestamp: stamp(), message, payload });
  event("mapping.started", "File mapping started."); const fingerprints: FileFingerprint[] = [];
  for (const file of manifest.files) { event("file.mapping.started", `Inspecting ${file.filename}.`, file.id); const bytes = await readStoredFile(dossierId, file); const fingerprint = await createFileFingerprint({ fileId: file.id, filename: file.filename, bytes, mimeType: file.mimeType }); fingerprints.push(fingerprint); event("file.fingerprint.created", `Created fingerprint for ${file.filename}.`, file.id, { fingerprint: { headers: fingerprint.headers, sheetNames: fingerprint.sheetNames, titleCandidates: fingerprint.titleCandidates, referencedFiles: fingerprint.referencedFiles, warnings: fingerprint.extractionWarnings } }); }
  const results = fingerprints.map(classifyWithRules); const ambiguous = results.filter((result) => result.confidence < 0.9);
  for (const result of results) event("file.rule_classification.completed", "Completed deterministic classification.", result.fileId, { confidence: result.confidence });
  if (agent && ambiguous.length > 0) { try { ambiguous.forEach((result) => event("file.agent_classification.requested", "Requested agent fallback.", result.fileId)); const agentResults = await agent.classify(fingerprints.filter((fingerprint) => ambiguous.some((result) => result.fileId === fingerprint.fileId))); for (const agentResult of agentResults) { const index = results.findIndex((result) => result.fileId === agentResult.fileId); if (index >= 0 && agentResult.confidence >= results[index].confidence) results[index] = agentResult; } } catch { ambiguous.forEach((result) => { result.warnings.push("Agent fallback unavailable — classified using deterministic rules."); }); } }
  const groups = [...new Set(results.map((result) => result.primaryDomain))].map((domain) => ({ id: `group:${domain}`, domain, label: domainLabels[domain], fileIds: results.filter((result) => result.primaryDomain === domain).map((result) => result.fileId) }));
  for (const group of groups) { event("map.group.created", `Created ${group.label} group.`, undefined, { groupId: group.id, domain: group.domain }); group.fileIds.forEach((fileId) => event("file.assigned", "Assigned file to group.", fileId, { groupId: group.id })); }
  results.forEach((result) => { event("file.classified", "Classified file.", result.fileId, { result }); if (result.primaryDomain === "unknown" || result.confidence < 0.65) event("file.review.required", "File requires review.", result.fileId, { warnings: result.warnings }); });
  const connections = discoverFileConnections(fingerprints); connections.forEach((connection) => event("file.connection.discovered", "Discovered file connection.", undefined, { connection }));
  const now = stamp(); const fileMap: FileMap = { dossierId, createdAt: now, updatedAt: now, files: results, groups, connections, summary: { totalFiles: results.length, mappedFiles: results.filter((result) => result.primaryDomain !== "unknown").length, unknownFiles: results.filter((result) => result.primaryDomain === "unknown").length, agentClassifiedFiles: results.filter((result) => result.method === "agent").length, reviewRequiredFiles: results.filter((result) => result.primaryDomain === "unknown" || result.confidence < 0.65).length } };
  event("mapping.completed", "File mapping completed.", undefined, { summary: fileMap.summary }); await saveMapping(dossierId, fileMap, events); return { fileMap, events };
}
