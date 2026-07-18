import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import type { FileMap, FileMappingEvent } from "../domain/contracts";

const root = join(process.cwd(), "data", "dossiers");
const safeId = (value: string) => { if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("Invalid dossier identifier."); return value; };
const dossierDir = (id: string) => join(root, safeId(id));
const manifestPath = (id: string) => join(dossierDir(id), "manifest.json");
const mappingDir = (id: string) => join(dossierDir(id), "mapping");
const mappingPath = (id: string) => join(mappingDir(id), "file-map.json");
const eventsPath = (id: string) => join(mappingDir(id), "mapping-events.json");
const mapSchema = z.object({ dossierId: z.string(), createdAt: z.string(), updatedAt: z.string(), files: z.array(z.unknown()), groups: z.array(z.unknown()), connections: z.array(z.unknown()), summary: z.object({ totalFiles: z.number(), mappedFiles: z.number(), unknownFiles: z.number(), agentClassifiedFiles: z.number(), reviewRequiredFiles: z.number() }) });
export type StoredFile = { id: string; filename: string; relativePath?: string; mimeType: string; size: number; storedName: string; lastModified: number };
export type DossierManifest = { dossierId: string; files: StoredFile[]; createdAt: string };
async function atomic(path: string, value: unknown) { await mkdir(join(path, ".."), { recursive: true }); const temporary = `${path}.tmp`; await writeFile(temporary, JSON.stringify(value, null, 2), "utf8"); await rename(temporary, path); }
export async function saveManifest(manifest: DossierManifest) { await atomic(manifestPath(manifest.dossierId), manifest); }
export async function getManifest(dossierId: string): Promise<DossierManifest | null> { try { return JSON.parse(await readFile(manifestPath(dossierId), "utf8")) as DossierManifest; } catch { return null; } }
export async function saveUploadedFile(dossierId: string, file: StoredFile, bytes: Uint8Array) { const directory = join(dossierDir(dossierId), "files"); await mkdir(directory, { recursive: true }); await writeFile(join(directory, basename(file.storedName)), bytes); }
export async function readStoredFile(dossierId: string, file: StoredFile) { return readFile(join(dossierDir(dossierId), "files", basename(file.storedName))); }
export async function saveMapping(dossierId: string, fileMap: FileMap, events: FileMappingEvent[]) { await mkdir(mappingDir(dossierId), { recursive: true }); await atomic(mappingPath(dossierId), fileMap); await atomic(eventsPath(dossierId), events); }
export async function getMapping(dossierId: string): Promise<{ fileMap: FileMap; events: FileMappingEvent[] } | null> { try { const fileMap = JSON.parse(await readFile(mappingPath(dossierId), "utf8")); if (!mapSchema.safeParse(fileMap).success) return null; const events = JSON.parse(await readFile(eventsPath(dossierId), "utf8")) as FileMappingEvent[]; return { fileMap: fileMap as FileMap, events }; } catch { return null; } }
