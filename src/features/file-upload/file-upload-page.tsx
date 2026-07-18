"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
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

type SelectedUpload = Omit<UploadedFile, "dossierId">;

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

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKey(file: Pick<SelectedUpload, "filename" | "size" | "lastModified">) {
  return `${file.filename}:${file.size}:${file.lastModified}`;
}

export function FileUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedUpload[]>([]);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const setDossierId = usePipelineStore((state) => state.setDossierId);
  const setUploadedFiles = usePipelineStore(
    (state) => state.setUploadedFiles,
  );
  const setProcessingQueue = usePipelineStore(
    (state) => state.setProcessingQueue,
  );
  const setActiveStage = usePipelineStore((state) => state.setActiveStage);

  const addFiles = (files: FileList | File[]) => {
    const candidates = Array.from(files);

    if (candidates.length === 0) {
      setValidationMessages(["No files were selected."]);
      return;
    }

    const existingFileKeys = new Set(selectedFiles.map(fileKey));
    const acceptedFiles: SelectedUpload[] = [];
    const messages: string[] = [];

    for (const file of candidates) {
      const extension = getFileExtension(file.name);
      const key = `${file.name}:${file.size}:${file.lastModified}`;

      if (!acceptedExtensions.has(extension)) {
        messages.push(
          `${file.name} was not added because its format is not supported.`,
        );
        continue;
      }

      if (file.size === 0) {
        messages.push(`${file.name} was not added because it is empty.`);
        continue;
      }

      if (existingFileKeys.has(key)) {
        messages.push(`${file.name} is already selected.`);
        continue;
      }

      existingFileKeys.add(key);
      acceptedFiles.push({
        id: createIdentifier("file"),
        filename: file.name,
        extension,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
      });
    }

    if (acceptedFiles.length > 0) {
      setSelectedFiles((currentFiles) => [...currentFiles, ...acceptedFiles]);
    }

    setValidationMessages(messages);
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

  const removeFile = (fileId: string) => {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== fileId),
    );
    setValidationMessages([]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setValidationMessages([
        "Select at least one supported, non-empty file before building the map.",
      ]);
      return;
    }

    const dossierId = createIdentifier("dossier");
    const uploadedFiles: UploadedFile[] = selectedFiles.map((file) => ({
      ...file,
      dossierId,
    }));

    setDossierId(dossierId);
    setUploadedFiles(uploadedFiles);
    setProcessingQueue(uploadedFiles.map((file) => file.id));
    setActiveStage("files");
    router.push(`/dossiers/${dossierId}/workspace/files`);
  };

  const selectedFileLabel =
    selectedFiles.length === 1
      ? "1 file selected"
      : `${selectedFiles.length} files selected`;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950 sm:px-10">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Tech Europe / Cortea Hackathon
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
          Build a dossier map
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-700">
          Select the source documents for this investigation. They stay in your
          browser while the map is prepared.
        </p>

        <form className="mt-10" onSubmit={handleSubmit}>
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
            <p className="text-lg font-semibold text-slate-950">
              Add dossier files
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              PDF, CSV, TXT, XLSX, XML, or DOCX. Drag files here or choose them
              from your computer.
            </p>
            <button
              className="mt-6 border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 motion-reduce:transition-none"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Choose files
            </button>
            <input
              accept={acceptAttribute}
              className="sr-only"
              multiple
              onChange={handleInputChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          <p
            aria-live="polite"
            className="mt-4 text-sm font-medium text-slate-700"
          >
            {selectedFileLabel}
          </p>

          {validationMessages.length > 0 ? (
            <div
              aria-live="assertive"
              className="mt-4 border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-slate-800"
              role="alert"
            >
              <ul className="space-y-1">
                {validationMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {selectedFiles.length > 0 ? (
            <section aria-label="Selected files" className="mt-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Selected files
              </h2>
              <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white">
                {selectedFiles.map((file) => (
                  <li
                    className="flex items-center justify-between gap-4 px-4 py-3"
                    key={file.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-950">
                        {file.filename}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {file.extension.toUpperCase()} - {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      aria-label={`Remove ${file.filename}`}
                      className="shrink-0 text-sm font-semibold text-slate-700 underline decoration-slate-400 underline-offset-4 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                      onClick={() => removeFile(file.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <button
            className="mt-8 w-full border border-emerald-700 bg-emerald-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none"
            type="submit"
          >
            Build the map
          </button>
        </form>
      </section>
    </main>
  );
}
