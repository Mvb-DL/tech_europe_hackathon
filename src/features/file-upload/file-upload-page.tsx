"use client";

import { FolderUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
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

  const startFileMap = (selectedFiles: Omit<UploadedFile, "dossierId">[]) => {
    const dossierId = createIdentifier("dossier");
    const uploadedFiles: UploadedFile[] = selectedFiles.map((file) => ({
      ...file,
      dossierId,
    }));

    resetPipelineRun();
    setDossierId(dossierId);
    setUploadedFiles(uploadedFiles);
    setProcessingQueue(uploadedFiles.map((file) => file.id));
    setActiveStage("files");
    router.push(`/dossiers/${dossierId}/workspace/files`);
  };

  const addFiles = (files: FileList | File[]) => {
    const candidates = Array.from(files);

    if (candidates.length === 0) {
      setValidationMessage("No supported files found.");
      return;
    }

    const acceptedFiles: Omit<UploadedFile, "dossierId">[] = [];
    const seenFiles = new Set<string>();

    for (const file of candidates) {
      const extension = getFileExtension(file.name);
      const relativePath = file.webkitRelativePath || file.name;
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
        id: createIdentifier("file"),
        filename: relativePath,
        extension,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
        relativePath: file.webkitRelativePath || undefined,
      });
    }

    if (acceptedFiles.length > 0) {
      startFileMap(acceptedFiles);
      return;
    }

    setValidationMessage("No supported, non-empty files found.");
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950 sm:px-10">
      <section className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold">Cortea</h1>
        <p className="mt-2 text-sm text-slate-600">Add files or a folder to start mapping.</p>

        <div className="mt-8">
          <div
            className={`border border-dashed p-8 text-center transition-colors motion-reduce:transition-none sm:p-10 ${
              isDragging
                ? "border-emerald-600 bg-emerald-50"
                : "border-slate-300 bg-white"
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
            <Upload aria-hidden="true" className="mx-auto text-emerald-700" size={26} />
            <p className="mt-3 text-sm font-semibold text-slate-950">Drop source files</p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                className="inline-flex h-9 w-9 items-center justify-center border border-slate-900 bg-slate-950 text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={() => fileInputRef.current?.click()}
                title="Choose files"
                type="button"
              >
                <Upload aria-hidden="true" size={16} />
                <span className="sr-only">Choose files</span>
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                onClick={() => folderInputRef.current?.click()}
                title="Choose folder"
                type="button"
              >
                <FolderUp aria-hidden="true" size={16} />
                <span className="sr-only">Choose folder</span>
              </button>
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

          {validationMessage ? (
            <div
              aria-live="assertive"
              className="mt-4 text-sm text-amber-800"
              role="alert"
            >
              {validationMessage}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
