"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, CheckCircle2, Activity, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { extractAiData, fetchTimeline, fetchSafety, fetchAiSummary } from "@/lib/api";

const processingSteps = [
  "Document Intake & Validation",
  "OCR & PyMuPDF Text Extraction",
  "Document Categorization",
  "Groq AI Medical Data Extraction",
  "Supabase PostgreSQL Persistence",
  "Timeline Generation",
  "Drug Safety & Interaction Check",
  "Lab Trend & AI Summary Generation",
];

function ProcessingContent() {
  const searchParams = useSearchParams();
  const rawIds = searchParams.get("ids");
  const docIds = rawIds ? rawIds.split(",").map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)) : [];

  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runRealAnalysis() {
      try {
        setErrorMsg(null);
        setCurrentStep(0); // Intake

        await new Promise((r) => setTimeout(r, 400));
        if (!isMounted) return;
        setCurrentStep(1); // OCR & Extraction

        // If specific document IDs were passed, execute AI extraction on them
        if (docIds.length > 0) {
          for (const docId of docIds) {
            await extractAiData(docId);
          }
        }

        if (!isMounted) return;
        setCurrentStep(2); // Categorization
        await new Promise((r) => setTimeout(r, 300));

        if (!isMounted) return;
        setCurrentStep(3); // Groq LLM
        await new Promise((r) => setTimeout(r, 300));

        if (!isMounted) return;
        setCurrentStep(4); // Database Persistence
        await new Promise((r) => setTimeout(r, 300));

        if (!isMounted) return;
        setCurrentStep(5); // Timeline
        await fetchTimeline();

        if (!isMounted) return;
        setCurrentStep(6); // Safety
        await fetchSafety();

        if (!isMounted) return;
        setCurrentStep(7); // Lab trends & summary
        await fetchAiSummary();
        await new Promise((r) => setTimeout(r, 200));

        if (!isMounted) return;
        setCurrentStep(processingSteps.length);
        setIsComplete(true);

      } catch (err: any) {
        if (isMounted) {
          console.error("Processing pipeline error:", err);
          setErrorMsg(err.message || "Failed to process medical documents.");
        }
      }
    }

    runRealAnalysis();

    return () => {
      isMounted = false;
    };
  }, [rawIds]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">AI Analysis in Progress</h1>
        <p className="text-slate-500">Please wait while our engine cross-checks your medical data securely.</p>
      </div>

      {errorMsg ? (
        <div className="w-full max-w-md bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Processing Error</h2>
          <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              Upload New Document
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center w-full gap-16 md:gap-24 relative">
          {/* Core Animation Graphic */}
          <div className="relative flex-1 flex justify-center items-center">
            <div className="absolute inset-0 bg-brand-500/5 rounded-full blur-[100px] w-full h-full" />

            <motion.div
              className="relative flex items-center justify-center"
              animate={{
                scale: isComplete ? 1.1 : [1, 1.05, 1],
              }}
              transition={{
                duration: isComplete ? 0.5 : 2,
                repeat: isComplete ? 0 : Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Outer Ring */}
              <motion.div
                className={`absolute w-64 h-64 rounded-full border border-dashed ${
                  isComplete ? "border-emerald-300 bg-emerald-50/50" : "border-brand-300 bg-brand-50/20"
                }`}
                animate={{ rotate: isComplete ? 0 : 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              {/* Middle Ring */}
              <motion.div
                className={`absolute w-48 h-48 rounded-full border ${
                  isComplete ? "border-emerald-200" : "border-brand-200"
                } border-opacity-50`}
                animate={{ rotate: isComplete ? 0 : -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              {/* Inner Core */}
              <div
                className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-xl border ${
                  isComplete
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-gradient-to-br from-brand-500 to-brand-600 border-brand-400"
                }`}
              >
                <AnimatePresence mode="wait">
                  {isComplete ? (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <CheckCircle2 className="w-16 h-16 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <BrainCircuit className="w-16 h-16 text-white animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!isComplete && (
                <>
                  <motion.div
                    className="absolute w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                    animate={{ rotate: 360, x: [80, 100, 80] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    style={{ originX: 0, originY: 0 }}
                  />
                  <motion.div
                    className="absolute w-3 h-3 rounded-full bg-brand-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
                    animate={{ rotate: -360, x: [-120, -100, -120] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ originX: 0, originY: 0 }}
                  />
                </>
              )}
            </motion.div>
          </div>

          {/* Steps List */}
          <div className="flex-1 w-full max-w-sm">
            <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-100" />
              <motion.div
                className="absolute top-0 left-0 w-1 bg-gradient-to-b from-brand-600 to-accent-500"
                initial={{ height: "0%" }}
                animate={{ height: `${(currentStep / processingSteps.length) * 100}%` }}
                transition={{ ease: "linear" }}
              />

              <div className="space-y-6 relative pl-6">
                {processingSteps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isPast = idx < currentStep || isComplete;

                  return (
                    <div key={idx} className="flex items-center gap-4 relative">
                      <div className="absolute -left-[31px] bg-white w-4 h-4 rounded-full flex items-center justify-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            isPast
                              ? "bg-emerald-500"
                              : isActive
                              ? "bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                              : "bg-slate-200"
                          }`}
                        />
                      </div>

                      <div className="flex-1 flex items-center justify-between">
                        <span
                          className={`text-sm transition-all ${
                            isPast
                              ? "text-slate-500 font-medium"
                              : isActive
                              ? "text-brand-700 font-bold"
                              : "text-slate-400"
                          }`}
                        >
                          {step}
                        </span>

                        {isActive && !isComplete && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </motion.div>
                        )}

                        {isPast && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Action */}
      <AnimatePresence>
        {isComplete && !errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 flex flex-col items-center"
          >
            <p className="text-emerald-600 font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Analysis completed successfully
            </p>
            <Link
              href="/dashboard"
              className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-xl shadow-brand-500/25 flex items-center gap-2"
            >
              View Full Report <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[50vh]">
        <BrainCircuit className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  );
}
