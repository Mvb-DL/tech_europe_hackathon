import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { classifyWithRules } from "../src/features/file-mapping/classification/rule-classifier";
import { discoverFileConnections } from "../src/features/file-mapping/connections/discover-file-connections";
import type { FileFingerprint } from "../src/features/file-mapping/domain/contracts";
import { createFileFingerprint } from "../src/features/file-mapping/fingerprint/create-file-fingerprint";
import { getMapping, saveManifest, saveUploadedFile } from "../src/features/file-mapping/repositories/file-map-repository";
import { mapDossier } from "../src/features/file-mapping/services/map-dossier";

const encoder = new TextEncoder();
function fingerprint(overrides: Partial<FileFingerprint> = {}): FileFingerprint {
  return { fileId: "file-1", filename: "Anlagen.txt", extension: "txt", mimeType: "text/plain", sizeBytes: 1, languageCandidates: ["de"], reportingPeriodCandidates: ["2025"], sheetNames: [], tableNames: [], headers: ["Anlagennummer", "Anschaffungswert"], titleCandidates: [], sampleRows: [], referencedFiles: [], extractionWarnings: [], ...overrides };
}

test("fingerprints semicolon CSV data and classifies fixed-asset master data", async () => {
  const value = await createFileFingerprint({ fileId: "asset", filename: "Anlagen.csv", mimeType: "text/csv", bytes: encoder.encode("Anlagennummer;Anschaffungswert\nA-1;1.234,50\n") });
  assert.equal(value.delimiter, ";");
  assert.deepEqual(value.headers, ["Anlagennummer", "Anschaffungswert"]);
  const result = classifyWithRules(value);
  assert.equal(result.primaryDomain, "fixed_assets");
  assert.equal(result.documentRole, "master_data");
  assert.ok(result.confidence >= 0.9);
});

test("explicit references and specific shared keys create confirmed connections", () => {
  const xml = fingerprint({ fileId: "manifest", filename: "index.xml", extension: "xml", referencedFiles: ["Anlagen.txt"], headers: [] });
  const assets = fingerprint({ fileId: "assets", filename: "Anlagen.txt", headers: ["Anlagennummer"] });
  const connections = discoverFileConnections([xml, assets]);
  assert.equal(connections.length, 1);
  assert.equal(connections[0].relationship, "defines_schema_for");
  assert.equal(connections[0].status, "confirmed");
});

test("generic shared fields do not create confirmed connections", () => {
  const left = fingerprint({ fileId: "left", filename: "left.csv", headers: ["Date", "Amount", "Status"] });
  const right = fingerprint({ fileId: "right", filename: "right.csv", headers: ["Date", "Amount", "Status"] });
  assert.equal(discoverFileConnections([left, right]).length, 0);
});

test("mapping persists and reloads without an agent", async () => {
  const dossierId = `test-${randomUUID().replaceAll("-", "")}`;
  const stored = { id: "asset", filename: "Anlagen.csv", mimeType: "text/csv", size: 42, storedName: "asset.csv", lastModified: Date.now() };
  await saveUploadedFile(dossierId, stored, encoder.encode("Anlagennummer;Anschaffungswert\nA-1;100\n"));
  await saveManifest({ dossierId, createdAt: new Date().toISOString(), files: [stored] });
  const mapped = await mapDossier(dossierId, null);
  const loaded = await getMapping(dossierId);
  assert.equal(mapped.fileMap.files[0].primaryDomain, "fixed_assets");
  assert.equal(loaded?.fileMap.summary.totalFiles, 1);
  assert.ok(mapped.events.some((event) => event.type === "file.assigned"));
});
