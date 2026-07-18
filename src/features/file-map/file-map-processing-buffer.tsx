"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FileText } from "lucide-react";
import type { UploadedFile } from "@/lib/pipeline/contracts";
import {
  type FileMapStatus,
  formatFileSize,
} from "./file-map-utils";

type FileMapProcessingBufferProps = {
  activeFileId?: string;
  activeStatus: FileMapStatus;
  failedFileIds: Set<string>;
  files: UploadedFile[];
  queue: string[];
};

type FileCardProps = {
  file: UploadedFile;
  isActive?: boolean;
  status: FileMapStatus;
};

function FileCard({ file, isActive = false, status }: FileCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const isFailed = status === "failed";

  return (
    <motion.div
      animate={{
        opacity: 1,
        scale: isActive && !shouldReduceMotion ? 1.02 : 1,
        y: 0,
      }}
      className={`border bg-white p-3 shadow-sm ${
        isFailed
          ? "border-dashed border-[#B4780F]/45 bg-[#FBF2DE]"
          : isActive
            ? "border-[#2F63E6] bg-[#EDF1FC] ring-1 ring-[#2F63E6]"
            : "border-[#E6E7EC]"
      }`}
      exit={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.96, x: 12 }
      }
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      layout
      layoutId={`file-card-${file.id}`}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.32, ease: "easeOut" }
      }
    >
      <div className="flex items-start gap-2">
        <FileText
          aria-hidden="true"
          className={isFailed ? "text-[#B4780F]" : isActive ? "text-[#2F63E6]" : "text-[#5A6379]"}
          size={16}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1A2340]">
            {file.filename}
          </p>
          <p className="mt-1 text-xs text-[#5A6379]">
            {file.extension.toUpperCase()} - {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <p
        className={`mt-3 text-xs font-semibold uppercase tracking-wide ${
          isFailed ? "text-[#8A5A08]" : isActive ? "text-[#2F63E6]" : "text-[#5A6379]"
        }`}
      >
        {status}
      </p>
    </motion.div>
  );
}

export function FileMapProcessingBuffer({
  activeFileId,
  activeStatus,
  failedFileIds,
  files,
  queue,
}: FileMapProcessingBufferProps) {
  const activeFile =
    activeStatus === "reading" || activeStatus === "classified"
      ? files.find((file) => file.id === activeFileId)
      : undefined;
  const queuedFiles = queue
    .filter((fileId) => fileId !== activeFile?.id)
    .map((fileId) => files.find((file) => file.id === fileId))
    .filter((file): file is UploadedFile => Boolean(file));
  const failedFiles = files.filter((file) => failedFileIds.has(file.id));
  const taskText =
    activeFile
      ? `Mapping ${activeFile.filename}`
      : queue.length > 0
        ? "Waiting for classification results"
        : files.length > 0
          ? "All uploaded files assigned"
          : "Waiting for uploaded files";

  return (
    <div className="p-4">
      <section className="rounded-lg border border-[#2F63E6]/20 bg-[#EDF1FC] p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#2F63E6] text-white">
            <FileText aria-hidden="true" size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1A2340]">File mapping agent</p>
            <p className="mt-1 text-xs leading-5 text-[#2F63E6]">{taskText}</p>
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm font-semibold text-[#1A2340]">
        {queue.length === 1 ? "1 file remaining" : `${queue.length} files remaining`}
      </p>

      {activeFile ? (
        <section aria-label="Active file" className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#2F63E6]">
            Current file
          </p>
          <FileCard file={activeFile} isActive status={activeStatus} />
        </section>
      ) : null}

      {queuedFiles.length > 0 ? (
        <section aria-label="Queued files" className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5A6379]">
            Buffer stack
          </p>
          <AnimatePresence initial={false}>
            <div className="space-y-2">
              {queuedFiles.map((file) => (
                <FileCard file={file} key={file.id} status="queued" />
              ))}
            </div>
          </AnimatePresence>
        </section>
      ) : null}

      {failedFiles.length > 0 ? (
        <section aria-label="Failed files" className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8A5A08]">
            Needs review
          </p>
          <div className="space-y-2">
            {failedFiles.map((file) => (
              <FileCard file={file} key={file.id} status="failed" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
