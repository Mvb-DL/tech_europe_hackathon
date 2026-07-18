"use client";

import { FileText, FolderUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { UploadDossierResponse } from "@/features/dossiers/domain/contracts";
import type { UploadedFile } from "@/lib/pipeline/contracts";
import { usePipelineStore } from "@/lib/pipeline/store";

const acceptedExtensions = new Set([
  "pdf",
  "csv",
  "txt",
  "xlsx",
  "xml",
  "docx",
]);

const acceptAttribute = ".pdf,.csv,.txt,.xlsx,.xml,.docx";

function getFileExtension(filename: string) {
  const extensionIndex = filename.lastIndexOf(".");

  return extensionIndex === -1
    ? ""
    : filename.slice(extensionIndex + 1).toLowerCase();
}

function createIdentifier(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.();

  if (randomId) {
    return `${prefix}-${randomId}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function FileUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const setDossierId = usePipelineStore((state) => state.setDossierId);
  const setUploadedFiles = usePipelineStore(
    (state) => state.setUploadedFiles,
  );
  const setProcessingQueue = usePipelineStore(
    (state) => state.setProcessingQueue,
  );
  const setActiveStage = usePipelineStore((state) => state.setActiveStage);
  const resetPipelineRun = usePipelineStore((state) => state.resetPipelineRun);

  useEffect(() => {
    const folderInput = folderInputRef.current;
    folderInput?.setAttribute("webkitdirectory", "");
    folderInput?.setAttribute("directory", "");
  }, []);

  const startFileMap = async (
    selectedFiles: Array<{ file: File; metadata: Omit<UploadedFile, "dossierId"> }>,
  ) => {
    const formData = new FormData();
    selectedFiles.forEach(({ file }) => formData.append("files", file));
    formData.append("name", "Audit dossier");

    try {
      const response = await fetch("/api/dossiers", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as UploadDossierResponse | { error?: string };

      if (!("dossier" in payload) || payload.acceptedFileIds.length === 0) {
        const reasons = "rejectedFiles" in payload
          ? payload.rejectedFiles.map((file) => `${file.originalName}: ${file.reason}`).join(" ")
          : payload.error;

        throw new Error(reasons || "Upload failed");
      }

      const dossierId = payload.dossier.id;
      const uploadedFiles = payload.dossier.files.map<UploadedFile>((file) => ({
        dossierId,
        extension: file.extension,
        filename: file.originalName,
        id: file.id,
        lastModified: Date.parse(file.uploadedAt),
        mimeType: file.mimeType,
        size: file.sizeBytes,
      }));
      const rejectedMessage = payload.rejectedFiles.length > 0
        ? payload.rejectedFiles.map((file) => `${file.originalName}: ${file.reason}`).join(" ")
        : null;

      if (rejectedMessage) {
        setValidationMessage(rejectedMessage);
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      }

      resetPipelineRun();
      setDossierId(dossierId);
      setUploadedFiles(uploadedFiles);
      setProcessingQueue(uploadedFiles.map((file) => file.id));
      setActiveStage("files");
      router.push(`/dossiers/${dossierId}/workspace/files`);
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "Files could not be prepared.");
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    const candidates = Array.from(files);

    if (candidates.length === 0) {
      setValidationMessage("No supported files found.");
      return;
    }

    const acceptedFiles: Array<{
      file: File;
      metadata: Omit<UploadedFile, "dossierId">;
    }> = [];
    const seenFiles = new Set<string>();
    const relativePaths = candidates
      .map((file) => file.webkitRelativePath || file.name)
      .filter((name) => name.includes("/"));
    const rootFolder = relativePaths[0]?.split("/")[0];
    const shouldStripRootFolder = Boolean(
      rootFolder &&
        relativePaths.length > 0 &&
        relativePaths.every((name) => name.startsWith(`${rootFolder}/`)),
    );

    for (const file of candidates) {
      const extension = getFileExtension(file.name);
      const browserRelativePath = file.webkitRelativePath || file.name;
      const relativePath = shouldStripRootFolder
        ? browserRelativePath.slice(String(rootFolder).length + 1)
        : browserRelativePath;
      const key = `${relativePath}:${file.size}:${file.lastModified}`;

      if (
        !acceptedExtensions.has(extension) ||
        file.size === 0 ||
        seenFiles.has(key)
      ) {
        continue;
      }

      seenFiles.add(key);
      acceptedFiles.push({
        file,
        metadata: {
          id: createIdentifier("file"),
          filename: relativePath,
          extension,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          lastModified: file.lastModified,
          relativePath: file.webkitRelativePath || undefined,
        },
      });
    }

    if (acceptedFiles.length > 0) {
      await startFileMap(acceptedFiles);
      return;
    }

    setValidationMessage("No supported, non-empty files found.");
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      void addFiles(event.target.files);
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-8 py-8 text-[#1A2340]">
      <section className="mx-auto min-h-[960px] max-w-[1440px] overflow-hidden rounded-lg border border-[#E6E7EC] bg-white shadow-[0_24px_70px_rgba(26,35,64,0.08)]">
        <div className="border-b border-[#E6E7EC] px-10 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-md border border-[#2F63E6]/20 bg-[#EDF1FC] text-[#2F63E6]">
                <FileText aria-hidden="true" size={18} />
              </div>
              <div>
                <p className="text-[15px] font-bold leading-5">Proofline</p>
                <p className="text-[11px] font-medium text-[#5A6379]">Audit Investigation Workspace</p>
              </div>
            </div>
            <span className="rounded-full border border-[#2F63E6]/20 bg-[#EDF1FC] px-3 py-1 text-xs font-bold text-[#2F63E6]">
              New investigation
            </span>
          </div>
        </div>

        <div className="relative px-10 py-12">
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(47,99,230,0.09),rgba(47,99,230,0)_68%)]" />
          <div className="relative max-w-[760px]">
            <span className="inline-flex rounded-full border border-[#E6E7EC] bg-[#F7F6F2] px-3 py-1 text-xs font-semibold text-[#5A6379]">
              New investigation
            </span>
            <h1 className="mt-5 max-w-[720px] text-5xl font-bold leading-[1.05] tracking-[0] text-[#1A2340]">
              Turn a company dossier into a traceable investigation map.
            </h1>
            <p className="mt-5 max-w-[620px] text-base leading-7 text-[#5A6379]">
              Upload the complete audit dossier. Every extracted fact will remain connected to its original source.
            </p>
          </div>

          <div className="relative mt-9 grid max-w-[960px] grid-cols-[minmax(0,1fr)_280px] gap-5">
          <div
            className={`rounded-lg border border-dashed p-10 text-center transition-colors motion-reduce:transition-none ${
              isDragging
                ? "border-[#2F63E6] bg-[#EDF1FC]"
                : "border-[#98A0B0] bg-[#F7F6F2]"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload aria-hidden="true" className="mx-auto text-[#2F63E6]" size={30} />
            <p className="mt-4 text-lg font-bold text-[#1A2340]">Drop the dossier here</p>
            <p className="mt-1 text-sm text-[#5A6379]">or click to browse your files</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-[#2F63E6] bg-[#2F63E6] px-4 py-2 text-sm font-bold text-white shadow-[0_10px_22px_rgba(47,99,230,0.18)] hover:bg-[#2452C7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
                onClick={() => fileInputRef.current?.click()}
                title="Choose files"
                type="button"
              >
                <Upload aria-hidden="true" size={16} />
                Choose files
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-[#E6E7EC] bg-white px-4 py-2 text-sm font-bold text-[#5A6379] hover:bg-[#F2F3F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F63E6]"
                onClick={() => folderInputRef.current?.click()}
                title="Choose folder"
                type="button"
              >
                <FolderUp aria-hidden="true" size={16} />
                Choose folder
              </button>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {["PDF", "CSV", "TXT", "XLSX", "XML", "DOCX"].map((format) => (
                <span className="rounded-full border border-[#E6E7EC] bg-white px-3 py-1 text-xs font-bold text-[#5A6379]" key={format}>
                  {format}
                </span>
              ))}
            </div>
            <input
              accept={acceptAttribute}
              className="sr-only"
              multiple
              onChange={handleInputChange}
              ref={fileInputRef}
              type="file"
            />
            <input
              accept={acceptAttribute}
              className="sr-only"
              multiple
              onChange={handleInputChange}
              ref={folderInputRef}
              type="file"
            />
          </div>

          <aside className="rounded-lg border border-[#E6E7EC] bg-white p-4 shadow-[0_12px_30px_rgba(26,35,64,0.06)]">
            <p className="text-sm font-bold text-[#1A2340]">Selected files</p>
            <p className="mt-1 text-xs leading-5 text-[#5A6379]">
              Files are processed sequentially and stay linked to their source.
            </p>
            <div className="mt-4 max-h-[350px] space-y-2 overflow-y-auto pr-1">
              {[
                "Sachkontobuchungen.txt",
                "Lieferantenbuchungen.txt",
                "Kundenbuchungen.txt",
                "Anlagen.txt",
                "Anlagenbuchungen.txt",
                "Berechtigungsauswertung_2025.xlsx",
                "Jahresabschluss_2025.pdf",
                "Freigabe-Log_2025.csv",
                "Wareneingangsliste_2025.csv",
                "Stammdatenaenderungen_2025.csv",
              ].map((name) => (
                <div className="flex items-center gap-2 rounded-md border border-[#E6E7EC] bg-[#F7F6F2] px-3 py-2" key={name}>
                  <FileText aria-hidden="true" className="shrink-0 text-[#5A6379]" size={14} />
                  <span className="min-w-0 truncate text-xs font-semibold text-[#1A2340]">{name}</span>
                </div>
              ))}
            </div>
          </aside>

          {validationMessage ? (
            <div
              aria-live="assertive"
              className="col-span-2 text-sm font-semibold text-[#8A5A08]"
              role="alert"
            >
              {validationMessage}
            </div>
          ) : null}
        </div>
        </div>
      </section>
    </main>
  );
}
