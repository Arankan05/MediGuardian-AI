"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, CheckCircle2, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { uploadDocuments, extractAiData } from "@/lib/api";

type UploadingFile = {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  type: "pdf" | "image";
  errorMsg?: string;
  originalFile?: File;
  dbId?: number;
};

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    if (fileArray.length === 0) return;

    setGlobalError(null);

    const newUploads: UploadingFile[] = fileArray.map((file) => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        progress: 15,
        status: "uploading" as const,
        type: isPdf ? ("pdf" as const) : ("image" as const),
        originalFile: file,
      };
    });

    setFiles((prev) => [...newUploads, ...prev]);

    try {
      // 1. Upload files to backend
      const uploadRes = await uploadDocuments(fileArray);

      // Collect IDs of successful uploads
      const successfulDocIds: number[] = [];

      setFiles((prev) =>
        prev.map((f) => {
          const result = uploadRes.results.find((r) => r.filename === f.name);
          if (result && result.status === "Success") {
            successfulDocIds.push(result.id);
            return { ...f, progress: 50, status: "processing", dbId: result.id };
          }
          return {
            ...f,
            status: "error",
            errorMsg: result?.error || "Failed to upload document",
          };
        })
      );

      // 2. Perform AI Extraction for each document
      for (const result of uploadRes.results) {
        if (result.status === "Success") {
          try {
            await extractAiData(result.id);
            setFiles((prev) =>
              prev.map((f) =>
                f.name === result.filename
                  ? { ...f, progress: 100, status: "completed" }
                  : f
              )
            );
          } catch (err: any) {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === result.filename
                  ? { ...f, status: "error", errorMsg: err.message || "AI extraction failed" }
                  : f
              )
            );
          }
        }
      }

      // If at least one file succeeded, redirect to processing page with IDs for full analysis view
      if (successfulDocIds.length > 0) {
        router.push(`/dashboard/processing?ids=${successfulDocIds.join(",")}`);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Failed to upload files to backend server.");
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error", errorMsg: err.message || "Network/Server error" }
            : f
        )
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload Medical Records</h1>
        <p className="text-slate-500 mt-1">Upload your prescriptions, lab results, and imaging reports for AI analysis.</p>
      </div>

      {globalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{globalError}</p>
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-8 shadow-sm">
        {/* Dropzone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isDragging ? "border-brand-500 bg-brand-50/50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpeg,.jpg"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileSelect}
            ref={fileInputRef}
          />
          <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-brand-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">Drag & drop files here</h3>
              <p className="text-slate-500 text-sm mt-1">or click to browse from your computer</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-md">PDF</span>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-md">PNG</span>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-md">JPEG</span>
            </div>
          </div>
        </div>

        {/* Upload Progress List */}
        <div className="mt-8 space-y-4">
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    file.type === "pdf" ? "bg-red-50 text-red-500" : "bg-brand-50 text-brand-500"
                  }`}
                >
                  {file.type === "pdf" ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                    <span className="text-xs text-slate-500">
                      {file.status === "uploading" && "Uploading..."}
                      {file.status === "processing" && "AI Extracting..."}
                      {file.status === "completed" && "Done"}
                      {file.status === "error" && "Failed"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${file.status === "error" ? "bg-rose-500" : "bg-brand-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  </div>
                  {file.status === "error" && <p className="text-xs text-rose-500 mt-1">{file.errorMsg}</p>}
                </div>
                <div className="shrink-0 flex items-center justify-center w-8">
                  {file.status === "uploading" || file.status === "processing" ? (
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                  ) : file.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : null}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {files.some((f) => f.status === "completed") && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-sm text-slate-700">
              Documents processed. MediGuardian has built your timeline and cross-checked every medicine.
            </p>
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25 transition-colors hover:bg-brand-700"
            >
              View results
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
