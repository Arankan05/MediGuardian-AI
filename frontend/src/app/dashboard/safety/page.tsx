"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ShieldAlert, CheckCircle, Info, ChevronDown, Activity, Pill, Stethoscope, AlertTriangle, Loader2 } from "lucide-react";

type SafetyIssue = {
  issue_type: string;
  severity: "Red" | "Yellow" | "Green";
  description: string;
  related_medicines: string[];
  related_visits: string[];
  recommendation: string;
};

type SafetyReport = {
  risk_score: number;
  issues: SafetyIssue[];
};

const severityConfig = {
  Red: { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-500", icon: <ShieldAlert className="w-5 h-5 text-rose-600" />, label: "Critical" },
  Yellow: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-500", icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, label: "Warning" },
  Green: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500", icon: <Info className="w-5 h-5 text-emerald-600" />, label: "Information" },
};

export default function SafetyDashboard() {
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    fetch(`${API_URL}/safety-analysis`)
      .then(async res => {
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.detail || "Failed to fetch safety report");
        }
        return res.json();
      })
      .then(data => {
        if (data && typeof data.risk_score === 'number' && Array.isArray(data.issues)) {
          setReport(data);
        } else {
          setReport({ risk_score: 0, issues: [] });
        }
      })
      .catch(err => {
        console.error("Failed to fetch safety report", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [API_URL]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-slate-500 font-medium">Running safety analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">Error loading safety report</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const criticalCount = report.issues.filter(i => i.severity === "Red").length;
  const warningCount = report.issues.filter(i => i.severity === "Yellow").length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Medical Safety Analyzer</h1>
        <p className="text-slate-500 mt-2">Heuristic analysis of patient medical records to identify safety-related issues.</p>
      </div>

      {/* Summary Cards & Risk Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Risk Score Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className={`absolute inset-0 opacity-10 ${report.risk_score > 50 ? 'bg-rose-500' : report.risk_score > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <h3 className="text-sm font-semibold text-slate-500 mb-2 z-10">Overall Risk Score</h3>
          <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${report.risk_score > 50 ? 'text-rose-500' : report.risk_score > 20 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-1000`}
                strokeDasharray={`${report.risk_score}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-800">{report.risk_score}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* Alerts Summary */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-rose-50/50 backdrop-blur-sm rounded-2xl border border-rose-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-rose-600">Critical Issues</p>
              <h4 className="text-3xl font-bold text-rose-700">{criticalCount}</h4>
            </div>
          </div>
          
          <div className="bg-amber-50/50 backdrop-blur-sm rounded-2xl border border-amber-200 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-600">Warnings</p>
              <h4 className="text-3xl font-bold text-amber-700">{warningCount}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-500" /> Detected Safety Alerts
        </h2>
        
        {report.issues.length === 0 ? (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-8 text-center flex flex-col items-center justify-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-lg font-semibold text-emerald-700">No Safety Issues Detected</h3>
            <p className="text-emerald-600">The patient's medical records show no conflicts or severe abnormalities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.issues.map((issue, idx) => {
              const config = severityConfig[issue.severity] || severityConfig.Green;
              const isExpanded = expandedId === idx;

              return (
                <div 
                  key={idx} 
                  className={`bg-white rounded-xl border-l-4 ${config.border} border-y border-r border-slate-200 shadow-sm overflow-hidden transition-all`}
                >
                  <div 
                    className="p-5 flex items-start sm:items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : idx)}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-500">{issue.issue_type}</span>
                        </div>
                        <h3 className="text-base font-medium text-slate-800">{issue.description}</h3>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                      <ChevronDown className="w-5 h-5 text-slate-400 mt-2 sm:mt-0" />
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50 border-t border-slate-100"
                      >
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                          
                          {/* Details */}
                          <div className="space-y-4">
                            {issue.related_medicines && issue.related_medicines.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                                  <Pill className="w-3.5 h-3.5" /> Related Medicines
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {issue.related_medicines.map((m, i) => (
                                    <span key={i} className="bg-white border border-slate-200 text-slate-700 text-sm px-2.5 py-1 rounded-md">{m}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {issue.related_visits && issue.related_visits.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Related Visits</h4>
                                <div className="flex flex-wrap gap-2">
                                  {issue.related_visits.map((v, i) => (
                                    <span key={i} className="text-slate-600 text-sm font-medium">{v}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Recommendation */}
                          <div>
                            <div className={`h-full rounded-xl p-4 border ${config.bg} ${config.border.replace('border-', 'border-').replace('500', '200')}`}>
                              <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${config.color}`}>
                                <Stethoscope className="w-4 h-4" /> Medical Recommendation
                              </h4>
                              <p className={`text-sm font-medium text-slate-700`}>
                                {issue.recommendation}
                              </p>
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
