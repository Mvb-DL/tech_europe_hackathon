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
          ? "border-rose-300"
          : isActive
            ? "border-emerald-600 ring-1 ring-emerald-600"
            : "border-slate-200"
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
          className={isFailed ? "text-rose-700" : "text-slate-600"}
          size={16}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {file.filename}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {file.extension.toUpperCase()} - {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <p
        className={`mt-3 text-xs font-semibold uppercase tracking-wide ${
          isFailed ? "text-rose-700" : "text-slate-600"
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

  return (
    <div className="p-4">
      <p className="text-sm font-semibold text-slate-950">
        {queue.length === 1 ? "1 file in queue" : `${queue.length} files in queue`}
      </p>

      {activeFile ? (
        <section aria-label="Active file" className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Active
          </p>
          <FileCard file={activeFile} isActive status={activeStatus} />
        </section>
      ) : null}

      {queuedFiles.length > 0 ? (
        <section aria-label="Queued files" className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Queued
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Failed
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
