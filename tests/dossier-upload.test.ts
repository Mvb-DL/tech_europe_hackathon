import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { DossierServerConfig } from "../src/features/dossiers/config/server";
import { createFilesystemDossierRepository } from "../src/features/dossiers/repositories/dossier-repository";
import { uploadDossier, type UploadableFile } from "../src/features/dossiers/services/dossier-upload-service";
import { getSourceFile } from "../src/features/dossiers/services/source-file-service";
import { mapDossier } from "../src/features/file-mapping/services/map-dossier";
import { GET } from "../src/app/api/dossiers/[dossierId]/route";

function testConfig(root: string, overrides: Partial<DossierServerConfig> = {}): DossierServerConfig {
  return {
    dossierStorageRoot: root,
    maxFilesPerDossier: 50,
    maxFileSizeBytes: 1024 * 1024,
    maxTotalUploadBytes: 10 * 1024 * 1024,
    ...overrides,
  };
}

async function withStorage<T>(
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(path.join(tmpdir(), "proofline-upload-"));

  try {
    return await fn(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

function uploadable(
  name: string,
  contents: string,
  type = "application/octet-stream",
  metadata: Partial<Pick<UploadableFile, "originalName" | "relativePath">> = {},
): UploadableFile {
  const bytes = new TextEncoder().encode(contents);

  return {
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    name,
    ...metadata,
    size: bytes.byteLength,
    type,
  };
}

test("uploads multiple supported file types with stable metadata, hashes, manifest reload, and server-side bytes", async () => {
  await withStorage(async (root) => {
    const config = testConfig(root);
    const files = [
      uploadable("report.pdf", "%PDF-1.7"),
      uploadable("ledger.csv", "id,amount\n1,10"),
      uploadable("notes.txt", "plain text"),
      uploadable("workbook.xlsx", "xlsx bytes"),
      uploadable("index.xml", "<root />"),
      uploadable("letter.docx", "docx bytes"),
    ];
    const response = await uploadDossier({ files, name: "Upload test" }, { config });
    const repository = createFilesystemDossierRepository(config);
    const reloaded = await repository.getById(response.dossier.id);

    assert.equal(response.acceptedFileIds.length, 6);
    assert.equal(response.rejectedFiles.length, 0);
    assert.equal(response.dossier.status, "uploaded");
    assert.equal(reloaded?.id, response.dossier.id);
    assert.deepEqual(
      response.dossier.files.map((file) => file.extension).sort(),
      ["csv", "docx", "pdf", "txt", "xlsx", "xml"],
    );

    const firstFile = response.dossier.files[0];
    const sourceFile = await getSourceFile({
      dossierId: response.dossier.id,
      fileId: firstFile.id,
    }, config);

    assert.equal(sourceFile.metadata.sha256, firstFile.sha256);
    assert.deepEqual(
      Buffer.from(sourceFile.bytes),
      Buffer.from(await files[0].arrayBuffer()),
    );
    assert.match(firstFile.id, /^file-[a-f0-9-]+$/);
    assert.match(response.dossier.id, /^dossier-[a-f0-9-]+$/);
    assert.match(firstFile.sha256, /^[a-f0-9]{64}$/);
  });
});

test("Step 2 mapping reads files from the production upload manifest", async () => {
  await withStorage(async (root) => {
    const previousRoot = process.env.DOSSIER_STORAGE_ROOT;
    try {
      process.env.DOSSIER_STORAGE_ROOT = root;
      const response = await uploadDossier({
        files: [
          uploadable("Anlagen.txt", "ANY;CONTENT\n1;2", "text/plain", {
            originalName: "AV/Anlagen.txt",
            relativePath: "AV/Anlagen.txt",
          }),
        ],
      }, { config: testConfig(root) });
      const mapped = await mapDossier(response.dossier.id, null);

      assert.equal(mapped.fileMap.summary.mappedFiles, 1);
      assert.equal(mapped.fileMap.files[0].primaryDomain, "fixed_assets");
      assert.equal(mapped.fileMap.files[0].fileId, response.acceptedFileIds[0]);
    } finally {
      process.env.DOSSIER_STORAGE_ROOT = previousRoot;
    }
  });
});

test("rejects unsupported, empty, duplicate, oversized, and total-limit files without discarding valid files", async () => {
  await withStorage(async (root) => {
    const config = testConfig(root, {
      maxFileSizeBytes: 12,
      maxTotalUploadBytes: 18,
    });
    const response = await uploadDossier({
      files: [
        uploadable("valid.csv", "first"),
        uploadable("malware.exe", "bad"),
        uploadable("empty.txt", ""),
        uploadable("copy.csv", "first"),
        uploadable("large.pdf", "this file is too large"),
        uploadable("second.txt", "second-valid"),
        uploadable("third.xml", "<third />"),
      ],
    }, { config });

    assert.equal(response.acceptedFileIds.length, 2);
    assert.equal(response.dossier.status, "partially_uploaded");
    assert.match(
      response.rejectedFiles.map((file) => file.reason).join(" | "),
      /Unsupported file extension.*File is empty.*Duplicate file content.*maximum size.*maximum total size/i,
    );
  });
});

test("sanitizes stored filenames and never uses original names as storage keys", async () => {
  await withStorage(async (root) => {
    const response = await uploadDossier({
      files: [uploadable("../dangerous path/report final.csv", "id\n1")],
    }, { config: testConfig(root) });
    const file = response.dossier.files[0];

    assert.equal(file.originalName, "report final.csv");
    assert.ok(file.storedName.startsWith(`${file.id}-`));
    assert.ok(!file.storedName.includes(".."));
    assert.ok(!file.storedName.includes("\\"));
    assert.ok(!file.storedName.includes("/"));
  });
});

test("response does not expose absolute paths or AGENT_API_KEY", async () => {
  await withStorage(async (root) => {
    const previousKey = process.env.AGENT_API_KEY;
    process.env.AGENT_API_KEY = `secret-${randomUUID()}`;
    const response = await uploadDossier({
      files: [uploadable("safe.txt", "safe")],
    }, { config: testConfig(root) });
    const serialized = JSON.stringify(response);

    assert.equal(serialized.includes(root), false);
    assert.equal(serialized.includes(process.env.AGENT_API_KEY), false);
    process.env.AGENT_API_KEY = previousKey;
  });
});

test("read API rejects invalid dossier IDs and returns 404 for missing dossiers", async () => {
  const invalid = await GET(new Request("http://localhost/api/dossiers/../bad"), {
    params: Promise.resolve({ dossierId: "../bad" }),
  });
  const missing = await GET(new Request("http://localhost/api/dossiers/missing"), {
    params: Promise.resolve({ dossierId: `dossier-${randomUUID()}` }),
  });

  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
});
