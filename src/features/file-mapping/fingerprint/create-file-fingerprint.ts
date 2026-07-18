import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import type { FileFingerprint } from "../domain/contracts";

const maxText = 5000;
const maxRows = 5;
const referencedFilePattern = /(?:[\w.-]+[\\/])?[\w.-]+\.(?:csv|txt|xlsx|xml|pdf|docx)/gi;
const periodPattern = /(?:20\d{2})|(?:0[1-9]|1[0-2])[./-](?:20\d{2}|\d{2})/g;

function normalize(value: string) { return value.trim().replaceAll(/\s+/g, " "); }
function strings(value: string) { return [...new Set((value.match(referencedFilePattern) ?? []).map(normalize))].slice(0, 20); }
function periods(value: string) { return [...new Set(value.match(periodPattern) ?? [])].slice(0, 10); }
function languages(value: string) {
  const lower = value.toLowerCase();
  const result: string[] = [];
  if (/[äöüß]|\b(konto|buchung|anlage|freigabe|salden)\b/.test(lower)) result.push("de");
  if (/\b(invoice|account|payment|approval|balance)\b/.test(lower)) result.push("en");
  return result;
}
function decode(bytes: Uint8Array) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return new TextDecoder("windows-1252").decode(bytes); }
}
function delimiter(text: string) {
  const line = text.split(/\r?\n/).find((item) => item.trim()) ?? "";
  return [";", ",", "\t"].map((item) => ({ item, count: line.split(item).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.item ?? ",";
}
function parseLine(line: string, separator: string) {
  const result: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; }
    else if (character === separator && !quoted) { result.push(normalize(value)); value = ""; }
    else value += character;
  }
  result.push(normalize(value)); return result;
}
function base(input: { fileId: string; filename: string; bytes: Uint8Array; mimeType: string }, extension: string): FileFingerprint {
  return { fileId: input.fileId, filename: input.filename, extension, mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength, sha256: createHash("sha256").update(input.bytes).digest("hex"),
    languageCandidates: [], reportingPeriodCandidates: [], sheetNames: [], tableNames: [], headers: [],
    titleCandidates: [], sampleRows: [], referencedFiles: [], extractionWarnings: [] };
}
function enrichText(fingerprint: FileFingerprint, text: string) {
  fingerprint.textSample = text.slice(0, maxText); fingerprint.languageCandidates = languages(text);
  fingerprint.reportingPeriodCandidates = periods(text); fingerprint.referencedFiles = strings(text);
}

export interface FileFingerprinter { supports(input: { extension: string; mimeType: string }): boolean; createFingerprint(input: { fileId: string; filename: string; bytes: Uint8Array; mimeType: string }): Promise<FileFingerprint>; }

class DelimitedFingerprinter implements FileFingerprinter {
  supports({ extension }: { extension: string }) { return extension === "csv" || extension === "txt"; }
  async createFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
    const extension = input.filename.split(".").pop()?.toLowerCase() ?? "txt"; const fingerprint = base(input, extension);
    const text = decode(input.bytes); const separator = delimiter(text); const rows = text.split(/\r?\n/).filter((line) => line.trim());
    fingerprint.encoding = "utf-8 or windows-1252"; fingerprint.delimiter = separator === "\t" ? "tab" : separator;
    fingerprint.headers = parseLine(rows[0] ?? "", separator).filter(Boolean); fingerprint.rowCount = Math.max(0, rows.length - 1);
    fingerprint.sampleRows = rows.slice(1, maxRows + 1).map((line) => Object.fromEntries(fingerprint.headers.map((header, index) => [header, parseLine(line, separator)[index] ?? ""])));
    enrichText(fingerprint, text); return fingerprint;
  }
}
class XlsxFingerprinter implements FileFingerprinter {
  supports({ extension }: { extension: string }) { return extension === "xlsx"; }
  async createFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
    const fingerprint = base(input, "xlsx"); const workbook = XLSX.read(input.bytes, { type: "array", cellText: true });
    fingerprint.sheetNames = workbook.SheetNames.slice(0, 20); const samples: string[] = [];
    for (const name of fingerprint.sheetNames.slice(0, 5)) { const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], { header: 1, defval: "", blankrows: false }).slice(0, maxRows + 1); const headers = (rows[0] ?? []).map(String).map(normalize).filter(Boolean); if (fingerprint.headers.length === 0) fingerprint.headers = headers; fingerprint.sampleRows.push(...rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])))); samples.push(name, ...headers); }
    enrichText(fingerprint, samples.join(" ")); return fingerprint;
  }
}
class XmlFingerprinter implements FileFingerprinter {
  supports({ extension }: { extension: string }) { return extension === "xml"; }
  async createFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
    const fingerprint = base(input, "xml"); const text = decode(input.bytes); const root = text.match(/<([\w:-]+)(?:\s[^>]*)?>/);
    fingerprint.xmlRoot = root?.[1]; fingerprint.tableNames = [...new Set([...text.matchAll(/<([\w:-]+)/g)].map((match) => match[1]))].slice(0, 30);
    fingerprint.headers = [...new Set([...text.matchAll(/<field[^>]+name=["']([^"']+)/gi)].map((match) => match[1]))].slice(0, 50); enrichText(fingerprint, text); return fingerprint;
  }
}
class DocxFingerprinter implements FileFingerprinter {
  supports({ extension }: { extension: string }) { return extension === "docx"; }
  async createFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
    const fingerprint = base(input, "docx"); const extracted = await mammoth.extractRawText({ buffer: Buffer.from(input.bytes) }); const text = extracted.value;
    fingerprint.titleCandidates = text.split(/\r?\n/).map(normalize).filter((line) => line.length > 4).slice(0, 5); enrichText(fingerprint, text); return fingerprint;
  }
}
class PdfFingerprinter implements FileFingerprinter {
  supports({ extension }: { extension: string }) { return extension === "pdf"; }
  async createFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
    const fingerprint = base(input, "pdf");
    try { const { PDFParse } = await import("pdf-parse"); const parser = new PDFParse({ data: Buffer.from(input.bytes) }); const result = await parser.getText(); fingerprint.pageCount = result.total; const text = result.text; fingerprint.titleCandidates = text.split(/\r?\n/).map(normalize).filter((line) => line.length > 4).slice(0, 5); enrichText(fingerprint, text); await parser.destroy(); }
    catch { fingerprint.extractionWarnings.push("PDF text could not be extracted."); }
    return fingerprint;
  }
}

const fingerprinters: FileFingerprinter[] = [new DelimitedFingerprinter(), new XlsxFingerprinter(), new XmlFingerprinter(), new PdfFingerprinter(), new DocxFingerprinter()];
export async function createFileFingerprint(input: Parameters<FileFingerprinter["createFingerprint"]>[0]) {
  const extension = input.filename.split(".").pop()?.toLowerCase() ?? ""; const parser = fingerprinters.find((current) => current.supports({ extension, mimeType: input.mimeType }));
  if (!parser) { const fingerprint = base(input, extension); fingerprint.extractionWarnings.push("Unsupported file format."); return fingerprint; }
  try { return await parser.createFingerprint(input); } catch { const fingerprint = base(input, extension); fingerprint.extractionWarnings.push("Fingerprint extraction failed."); return fingerprint; }
}
