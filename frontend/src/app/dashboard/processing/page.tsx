"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, CheckCircle2, ChevronRight, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";

const processingSteps = [
  "Reading Documents...",
  "Extracting Text...",
  "Detecting Document Type...",
  "Finding Medicines...",
  "Extracting Lab Results...",
  "Building Timeline...",
  "Checking Drug Interactions...",
  "Analyzing Trends...",
  "Generating Summary..."
];

export default function ProcessingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentStep < processingSteps.length) {
      // Simulate varying time for different steps
      const delay = Math.random() * 1000 + 800; // Between 0.8s and 1.8s
      
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, delay);
      
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsComplete(true), 500);
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto py-12">
      
      <div className="text-center mb-16">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">AI Analysis in Progress</h1>
        <p className="text-slate-500">Please wait while our engine cross-checks your medical data securely.</p>
      </div>

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
              ease: "easeInOut"
            }}
          >
            {/* Outer Ring */}
            <motion.div 
              className={`absolute w-64 h-64 rounded-full border border-dashed ${isComplete ? 'border-emerald-300 bg-emerald-50/50' : 'border-brand-300 bg-brand-50/20'}`}
              animate={{ rotate: isComplete ? 0 : 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            {/* Middle Ring */}
            <motion.div 
              className={`absolute w-48 h-48 rounded-full border ${isComplete ? 'border-emerald-200' : 'border-brand-200'} border-opacity-50`}
              animate={{ rotate: isComplete ? 0 : -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner Core */}
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-xl border ${isComplete ? 'bg-emerald-500 border-emerald-400' : 'bg-gradient-to-br from-brand-500 to-brand-600 border-brand-400'}`}>
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
                    <BrainCircuit className="w-16 h-16 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Orbiting particles (only while processing) */}
            {!isComplete && (
              <>
                <motion.div 
                  className="absolute w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                  animate={{ 
                    rotate: 360,
                    x: [80, 100, 80],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ originX: 0, originY: 0 }}
                />
                <motion.div 
                  className="absolute w-3 h-3 rounded-full bg-brand-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
                  animate={{ 
                    rotate: -360,
                    x: [-120, -100, -120],
                  }}
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
                const isPast = idx < currentStep;

                return (
                  <div key={idx} className="flex items-center gap-4 relative">
                    {/* Status Dot */}
                    <div className="absolute -left-[31px] bg-white w-4 h-4 rounded-full flex items-center justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                        isPast ? "bg-emerald-500" : isActive ? "bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" : "bg-slate-200"
                      }`} />
                    </div>

                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-sm transition-all ${
                        isPast ? "text-slate-500 font-medium" : 
                        isActive ? "text-brand-700 font-bold" : "text-slate-400"
                      }`}>
                        {step}
                      </span>
                      
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-1"
                        >
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </motion.div>
                      )}
                      
                      {isPast && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Completion Action */}
      <AnimatePresence>
        {isComplete && (
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
