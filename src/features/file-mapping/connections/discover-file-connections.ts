import type { FileConnection, FileFingerprint, MappingReason } from "../domain/contracts";

const generic = new Set(["date", "amount", "name", "status", "datum", "betrag", "beschreibung"]);
const normalize = (value: string) => value.toLocaleLowerCase("de-DE").replaceAll(/[^a-z0-9äöüß]/g, "");
export function discoverFileConnections(fingerprints: FileFingerprint[]): FileConnection[] {
  const connections: FileConnection[] = [];
  for (const source of fingerprints) for (const target of fingerprints) {
    if (source.fileId >= target.fileId) continue;
    const targetNames = [target.filename.split(/[\\/]/).at(-1) ?? target.filename, target.filename].map(normalize);
    const sourceRefs = source.referencedFiles.map(normalize); const targetRefs = target.referencedFiles.map(normalize);
    const explicit = sourceRefs.some((reference) => targetNames.includes(reference)) || targetRefs.some((reference) => (source.filename.split(/[\\/]/).at(-1) ? normalize(source.filename.split(/[\\/]/).at(-1)!) === reference : false));
    const shared = source.headers.map(normalize).filter((header) => target.headers.map(normalize).includes(header) && !generic.has(header) && /(id|nummer|nr|konto|beleg|anlag|vendor|customer|liefer)/.test(header));
    if (!explicit && shared.length === 0) continue;
    const manifest = source.extension === "xml" || target.extension === "xml"; const reason: MappingReason = { signal: explicit ? "explicit_referenced_filename" : shared.join(", "), explanation: explicit ? "Observed explicit file reference." : "Observed specific shared key.", sourceRefs: [{ fileId: source.fileId, filename: source.filename }, { fileId: target.fileId, filename: target.filename }] };
    connections.push({ id: `connection:${source.fileId}:${target.fileId}`, sourceFileId: source.fileId, targetFileId: target.fileId, relationship: explicit ? (manifest ? "defines_schema_for" : "references") : "shares_key_with", sharedFields: shared, confidence: explicit ? 0.98 : 0.82, status: "confirmed", reasons: [reason] });
  }
  return connections;
}
