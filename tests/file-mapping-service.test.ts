import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { classifyWithRules } from "../src/features/file-mapping/classification/rule-classifier";
import { discoverFileConnections } from "../src/features/file-mapping/connections/discover-file-connections";
import type { FileFingerprint } from "../src/features/file-mapping/domain/contracts";
import { createFileFingerprint } from "../src/features/file-mapping/fingerprint/create-file-fingerprint";
import { getMapping, saveManifest, saveUploadedFile, type StoredFile } from "../src/features/file-mapping/repositories/file-map-repository";
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

const supportedExtensions = new Set(["pdf", "csv", "txt", "xlsx", "xml", "docx"]);

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }),
  );

  return nested.flat().sort();
}

function extensionOf(filename: string) {
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex === -1 ? "" : filename.slice(extensionIndex + 1).toLowerCase();
}

test("real Muster Verpackungen folder maps supported files into audit groups", async () => {
  const root = path.resolve("Uebungsdaten Muster Verpackungen");
  const dossierId = `real-${randomUUID().replaceAll("-", "")}`;
  const sourceFiles = (await listFiles(root)).filter((file) =>
    supportedExtensions.has(extensionOf(file)),
  );
  const manifestFiles: StoredFile[] = [];

  for (const filePath of sourceFiles) {
    const bytes = await fs.readFile(filePath);
    const relativePath = path.relative(root, filePath).replaceAll(path.sep, "/");
    const id = `file-${randomUUID().replaceAll("-", "")}`;
    const stored = {
      id,
      filename: relativePath,
      lastModified: (await fs.stat(filePath)).mtimeMs,
      mimeType: "application/octet-stream",
      size: bytes.byteLength,
      storedName: `${id}.${extensionOf(relativePath)}`,
    };

    await saveUploadedFile(dossierId, stored, bytes);
    manifestFiles.push(stored);
  }

  await saveManifest({ dossierId, createdAt: new Date().toISOString(), files: manifestFiles });
  const mapped = await mapDossier(dossierId, null);
  const byName = new Map(
    mapped.fileMap.files.map((file) => [
      manifestFiles.find((stored) => stored.id === file.fileId)?.filename,
      file,
    ]),
  );

  assert.equal(mapped.fileMap.summary.totalFiles, 31);
  assert.equal(mapped.fileMap.summary.mappedFiles, 31);
  assert.equal(mapped.fileMap.summary.unknownFiles, 0);
  assert.equal(mapped.fileMap.summary.reviewRequiredFiles, 0);
  assert.equal(byName.get("AV/Anlagen.txt")?.primaryDomain, "fixed_assets");
  assert.equal(byName.get("AV/Anlagenbuchungen.txt")?.documentRole, "transactions");
  assert.equal(byName.get("Sachkonten/Sachkonten.txt")?.primaryDomain, "general_ledger");
  assert.equal(byName.get("Begleitdokumente/OP-Liste_Debitoren_2025.xlsx")?.primaryDomain, "accounts_receivable");
  assert.equal(byName.get("Begleitdokumente/OP-Liste_Kreditoren_2025.xlsx")?.primaryDomain, "accounts_payable");
  assert.equal(byName.get("Begleitdokumente/Pruefungsplanung_JET_2025.docx")?.primaryDomain, "audit_planning");
  assert.ok(mapped.fileMap.groups.some((group) => group.label === "Fixed assets"));
});

test("unmatched future files receive traceable dynamic groups", async () => {
  const dossierId = `dynamic-${randomUUID().replaceAll("-", "")}`;
  const stored = {
    id: "new-analysis",
    filename: "NeueAuswertungen/Margenbonus_2027.csv",
    lastModified: Date.now(),
    mimeType: "text/csv",
    size: 64,
    storedName: "new-analysis.csv",
  };

  await saveUploadedFile(
    dossierId,
    stored,
    encoder.encode("BONUS_ID;KAMPAGNE;STAFFEL;BETRAG\nB-1;Fruehjahr;A;1000\n"),
  );
  await saveManifest({ dossierId, createdAt: new Date().toISOString(), files: [stored] });

  const mapped = await mapDossier(dossierId, null);
  const file = mapped.fileMap.files[0];
  const group = mapped.fileMap.groups[0];

  assert.equal(mapped.fileMap.summary.mappedFiles, 1);
  assert.equal(mapped.fileMap.summary.unknownFiles, 0);
  assert.equal(file.primaryDomain, "unknown");
  assert.equal(file.documentRole, "supporting_document");
  assert.match(file.groupLabel ?? "", /NeueAuswertungen|Margenbonus/i);
  assert.equal(group.domain, "custom");
  assert.equal(group.id, file.groupId);
  assert.ok(file.reasons[0].sourceRefs[0].filename.includes("Margenbonus_2027.csv"));
});
