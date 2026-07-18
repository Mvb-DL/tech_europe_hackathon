import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { UploadedFile } from "@/lib/pipeline/contracts";
import { getManifest, saveManifest, saveUploadedFile, type StoredFile } from "@/features/file-mapping/repositories/file-map-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadMetadata = { id?: string; filename?: string; relativePath?: string; lastModified?: number };
const supported = new Set(["csv", "txt", "xlsx", "xml", "pdf", "docx"]);
const extensionFor = (name: string) => name.split(".").at(-1)?.toLowerCase() ?? "";

export async function POST(request: Request, { params }: { params: Promise<{ dossierId: string }> }) {
  try {
    const { dossierId } = await params; const data = await request.formData(); const files = data.getAll("files").filter((value): value is File => value instanceof File); const metadata = JSON.parse(String(data.get("metadata") ?? "[]")) as UploadMetadata[];
    if (files.length === 0 || files.length !== metadata.length) return NextResponse.json({ error: "No supported files supplied." }, { status: 400 });
    const prior = await getManifest(dossierId); const stored: StoredFile[] = []; const uploaded: UploadedFile[] = [];
    for (const [index, file] of files.entries()) { const meta = metadata[index] ?? {}; const filename = meta.filename || file.name; const extension = extensionFor(filename); if (!supported.has(extension) || file.size === 0) continue; const id = meta.id && /^[a-zA-Z0-9_-]+$/.test(meta.id) ? meta.id : `file-${randomUUID()}`; const storedName = `${id}.${extension}`; const item: StoredFile = { id, filename, relativePath: meta.relativePath, mimeType: file.type || "application/octet-stream", size: file.size, storedName, lastModified: Number(meta.lastModified) || Date.now() }; await saveUploadedFile(dossierId, item, new Uint8Array(await file.arrayBuffer())); stored.push(item); uploaded.push({ id, dossierId, filename, relativePath: meta.relativePath, extension, mimeType: item.mimeType, size: item.size, lastModified: item.lastModified }); }
    if (stored.length === 0) return NextResponse.json({ error: "No supported files supplied." }, { status: 400 });
    await saveManifest({ dossierId, createdAt: prior?.createdAt ?? new Date().toISOString(), files: [...(prior?.files ?? []), ...stored] });
    return NextResponse.json({ files: uploaded });
  } catch { return NextResponse.json({ error: "Files could not be stored." }, { status: 400 }); }
}
