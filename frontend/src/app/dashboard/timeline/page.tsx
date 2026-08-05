"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Activity, Pill, FlaskConical, FileText, ChevronDown, CheckCircle2, AlertTriangle, Info, ArrowUpCircle, Loader2 } from "lucide-react";
import { fetchTimeline, resolveActivePatient } from "@/lib/api";

type TimelineEvent = {
  patient_name: string;
  visit_date: string;
  hospital: string;
  doctor: string;
  diagnosis: string[];
  medicines: any[];
  laboratory_results: any[];
  allergies: string[];
  notes: string;
  document_ids: number[];
  status: "blue" | "green" | "yellow" | "red";
};

const statusConfig = {
  blue: { color: "border-brand-500", bg: "bg-brand-50", icon: <Info className="text-brand-500 w-5 h-5" />, label: "Regular Visit" },
  green: { color: "border-emerald-500", bg: "bg-emerald-50", icon: <CheckCircle2 className="text-emerald-500 w-5 h-5" />, label: "Improvement" },
  yellow: { color: "border-amber-500", bg: "bg-amber-50", icon: <ArrowUpCircle className="text-amber-500 w-5 h-5" />, label: "Follow-up" },
  red: { color: "border-rose-500", bg: "bg-rose-50", icon: <AlertTriangle className="text-rose-500 w-5 h-5" />, label: "Important Finding" },
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [patientName, setPatientName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const active = await resolveActivePatient();
        setPatientName(active);
        const data = await fetchTimeline(active);
        setEvents(data || []);
      } catch (err: any) {
        console.error("Failed to fetch timeline", err);
        setError(err.message || "Failed to load timeline.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading patient timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">Error loading timeline</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-800">
          {patientName ? `Timeline for ${patientName}` : "Unified Patient Timeline"}
        </h1>
        <p className="text-slate-500 mt-2">Chronological view of all medical history and interactions.</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No events found</h3>
          <p className="text-slate-500 mt-2">Upload medical records to generate a timeline.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
          {events.map((event, idx) => {
            const config = statusConfig[event.status] || statusConfig.blue;
            const isExpanded = expandedId === `${idx}`;

            return (
              <div key={idx} className="relative pl-8">
                {/* Timeline Dot */}
                <div className="absolute -left-[11px] top-6 w-5 h-5 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${config.bg.replace("bg-", "bg-").replace("50", "500")}`} />
                </div>

                {/* Card */}
                <div
                  className={`bg-white/60 backdrop-blur-md border-l-4 ${config.color} border-y border-r border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer`}
                  onClick={() => setExpandedId(isExpanded ? null : `${idx}`)}
                >
                  {/* Card Header */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-700">{event.visit_date}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${config.bg} ${config.color.replace("border-", "text-")}`}>
                          {config.icon} {config.label}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{event.hospital}</h3>
                      <p className="text-sm text-slate-500">Attending: {event.doctor} • Patient: {event.patient_name}</p>
                    </div>

                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center self-start md:self-center"
                    >
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    </motion.div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/50"
                      >
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Diagnosis & Notes */}
                          <div className="space-y-4">
                            {event.diagnosis && event.diagnosis.length > 0 && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                  <Activity className="w-4 h-4 text-brand-500" /> Diagnosis
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {event.diagnosis.map((d, i) => (
                                    <span key={i} className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-md">
                                      {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {event.notes && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-700 mb-1">Clinical Notes</h4>
                                <p className="text-sm text-slate-600 italic bg-white p-3 rounded-lg border border-slate-200">
                                  "{event.notes}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Medications & Labs */}
                          <div className="space-y-4">
                            {event.medicines && event.medicines.length > 0 && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                  <Pill className="w-4 h-4 text-accent-400" /> Prescribed Medications
                                </h4>
                                <ul className="space-y-2">
                                  {event.medicines.map((med, i) => (
                                    <li key={i} className="text-sm bg-white p-2 rounded-lg border border-slate-200 flex justify-between">
                                      <span className="font-medium text-slate-700">{med.name}</span>
                                      <span className="text-slate-500">{med.dosage || med.strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {event.laboratory_results && event.laboratory_results.length > 0 && (
                              <div>
                                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                                  <FlaskConical className="w-4 h-4 text-emerald-500" /> Laboratory Results
                                </h4>
                                <ul className="space-y-2">
                                  {event.laboratory_results.map((lab, i) => (
                                    <li key={i} className="text-sm bg-white p-2 rounded-lg border border-slate-200 flex justify-between">
                                      <span className="font-medium text-slate-700">{lab.test_name}</span>
                                      <span className="text-slate-600 font-semibold">
                                        {lab.result} {lab.unit}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Source Documents */}
                        {event.document_ids && event.document_ids.length > 0 && (
                          <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-500 font-medium">Source Documents:</span>
                            <div className="flex gap-2">
                              {event.document_ids.map((id) => (
                                <span key={id} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded text-slate-600">
                                  DOC-{id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
