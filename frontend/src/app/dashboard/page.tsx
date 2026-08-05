"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  AlertTriangle,
  Activity,
  Clock,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import {
  fetchSafety,
  fetchTimeline,
  fetchLabTrends,
  resolveActivePatient,
} from "@/lib/api";
import { MedicalDisclaimer } from "@/components/Brand";

type Issue = {
  issue_type: string;
  severity: "Red" | "Yellow" | "Green";
  description: string;
  related_visits?: string[];
};

const SEVERITY_STYLE: Record<string, string> = {
  Red: "text-rose-700 bg-rose-50 border-rose-200",
  Yellow: "text-amber-700 bg-amber-50 border-amber-200",
  Green: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<string | undefined>();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [safety, setSafety] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const active = await resolveActivePatient();
        setPatient(active);
        const [tl, sa, tr] = await Promise.all([
          fetchTimeline(active),
          fetchSafety(active),
          fetchLabTrends(active),
        ]);
        setTimeline(tl || []);
        setSafety(sa);
        setTrends(tr || []);
      } catch (e: any) {
        setError(e?.message || "Could not reach the MediGuardian backend.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-slate-500">Loading your medical overview…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-800">Backend unavailable</h2>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
        <p className="mt-3 text-xs text-slate-500">
          Start it with{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono">uvicorn main:app --reload</code>{" "}
          inside the <code className="font-mono">backend</code> folder.
        </p>
      </div>
    );
  }

  const issues: Issue[] = safety?.issues ?? [];
  const summary = safety?.summary ?? {};
  const hasData = timeline.length > 0;

  if (!hasData) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">No records yet</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upload prescriptions, lab reports or discharge summaries and MediGuardian
          will build a connected timeline, cross-check them for conflicts, and track
          your lab trends.
        </p>
        <Link
          href="/dashboard/upload"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/25 transition-colors hover:bg-brand-700"
        >
          <UploadCloud className="h-4 w-4" />
          Upload documents
        </Link>
      </div>
    );
  }

  const riskScore = safety?.risk_score ?? 0;
  const riskTone =
    riskScore >= 50 ? "text-rose-600" : riskScore >= 20 ? "text-amber-600" : "text-emerald-600";

  const stats = [
    {
      label: "Visits on timeline",
      value: timeline.length,
      hint: `${summary.medications_reviewed ?? 0} medicines reviewed`,
      icon: Clock,
      tone: "text-brand-600 bg-brand-50",
    },
    {
      label: "Issues flagged",
      value: summary.total_issues ?? issues.length,
      hint: `${summary.red ?? 0} high priority`,
      icon: AlertTriangle,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Lab tests tracked",
      value: trends.length,
      hint: `${trends.filter((t) => t.out_of_range).length} outside normal range`,
      icon: Activity,
      tone: "text-accent-500 bg-accent-300/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {patient ? `Overview for ${patient}` : "Medical overview"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything MediGuardian found across your uploaded documents.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex w-fit items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-700"
        >
          <UploadCloud className="h-4 w-4" />
          Upload new document
        </Link>
      </div>

      {/* Risk banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                riskScore >= 50 ? "bg-rose-50" : riskScore >= 20 ? "bg-amber-50" : "bg-emerald-50"
              }`}
            >
              {riskScore >= 20 ? (
                <ShieldAlert className={`h-7 w-7 ${riskTone}`} />
              ) : (
                <ShieldCheck className={`h-7 w-7 ${riskTone}`} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Overall safety score</p>
              <p className={`text-3xl font-bold ${riskTone}`}>{riskScore}/100</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(["Red", "Yellow", "Green"] as const).map((sev) => (
              <span
                key={sev}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${SEVERITY_STYLE[sev]}`}
              >
                {sev === "Red" ? "High" : sev === "Yellow" ? "Review" : "Info"}:{" "}
                {sev === "Red" ? summary.red ?? 0 : sev === "Yellow" ? summary.yellow ?? 0 : summary.green ?? 0}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className="group flex items-start justify-between rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md"
          >
            <div>
              <p className="mb-1 text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="mb-2 text-3xl font-bold text-slate-800">{stat.value}</h3>
              <p className="text-xs font-medium text-slate-500">{stat.hint}</p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.tone} transition-transform group-hover:scale-110`}
            >
              <stat.icon className="h-6 w-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top issues + recent visits */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Needs your attention</h2>
            <Link
              href="/dashboard/safety"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {issues.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <ShieldCheck className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm text-slate-600">
                No conflicts found across your documents.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {issues.slice(0, 4).map((issue, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        SEVERITY_STYLE[issue.severity]
                      }`}
                    >
                      {issue.issue_type}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {issue.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recent visits</h2>
            <Link
              href="/dashboard/timeline"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Full timeline <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-3">
            {[...timeline]
              .reverse()
              .slice(0, 4)
              .map((event: any, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      {event.hospital}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.visit_date}
                      {event.doctor ? ` · ${event.doctor}` : ""}
                    </p>
                    {event.medicines?.length > 0 && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {event.medicines.map((m: any) => m.name).join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Assistant nudge */}
      <Link
        href="/dashboard/assistant"
        className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-accent-300/20 p-5 transition-shadow hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <BrainCircuit className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">Ask about your records</p>
          <p className="text-sm text-slate-600">
            “Was anything prescribed despite my allergy?” — answered from your documents only.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-brand-600" />
      </Link>

      <MedicalDisclaimer />
    </div>
  );
}
