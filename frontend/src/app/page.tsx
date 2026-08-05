"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BrandLockup, MedicalDisclaimer } from "@/components/Brand";
import { ArrowRight, ShieldCheck, FileSearch, Activity, BrainCircuit, Lock, HeartPulse, Stethoscope, FileText, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Ambient brand glow */}
      <div className="pointer-events-none fixed left-[-10%] top-[-10%] -z-10 h-[50vw] w-[50vw] rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] -z-10 h-[50vw] w-[50vw] rounded-full bg-accent-400/10 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 px-6 py-3.5 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandLockup />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#features" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">How it works</a>
            <a href="#ai" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">AI engine</a>
            <ThemeToggle />
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-brand-600 px-4 py-2 text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-700"
            >
              Get started
            </Link>
          </nav>
          <div className="flex items-center gap-4 md:hidden">
            <ThemeToggle />
            <Link
              href="/dashboard/upload"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-brand-500/25"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-7xl px-6 pt-20 pb-32 flex flex-col lg:flex-row items-center gap-12">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 w-fit">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-sm font-medium text-brand-700">YGC AI Buildathon 2026</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            Verify Medical Reports with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-500">Intelligent Precision</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Your prescriptions and lab reports live in different hospitals, in different formats, from different doctors. MediGuardian reads them all, builds one timeline, and flags the duplicate medicines, dosage conflicts, allergy contradictions and worsening lab trends that no single visit reveals.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/dashboard/upload">
              <button className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-brand-500/25 flex items-center gap-2 cursor-pointer">
                Upload your records <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50">
                View dashboard <Activity className="h-5 w-5 text-emerald-500" />
              </button>
            </Link>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 relative w-full aspect-square max-w-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-400/20 to-emerald-400/20 rounded-full blur-3xl" />
          <div className="relative w-full h-full bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/40 mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-brand-500" />
                <span className="font-semibold text-slate-700">AI Analysis Running...</span>
              </div>
              <span className="text-emerald-500 font-medium">98% Match</span>
            </div>
            
            <div className="space-y-4 flex-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/60 rounded-xl p-4 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-lg bg-slate-200/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200/50 rounded w-3/4" />
                    <div className="h-3 bg-slate-200/50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-auto pt-4 flex justify-between items-center bg-brand-50/50 rounded-xl p-4 border border-brand-100/50">
              <span className="text-sm font-medium text-brand-700">Diagnosis Confirmed</span>
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full bg-slate-50/50 border-y border-slate-200/50 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Enterprise-Grade Medical Security</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Our platform combines cutting-edge AI with medical knowledge bases to provide unparalleled protection against medical errors.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileSearch, title: "Report Analysis", desc: "Upload lab results, MRI scans, and doctors' notes. Our AI reads and interprets complex medical jargon instantly.", colorClass: "text-brand-500", bgClass: "bg-brand-50" },
              { icon: ShieldCheck, title: "Safety Cross-Checks", desc: "Catches duplicate medicines, conflicting dosages, allergy contradictions and risky drug interactions across every visit.", colorClass: "text-emerald-500", bgClass: "bg-emerald-50" },
              { icon: Lock, title: "Data Privacy", desc: "Your medical data is encrypted with military-grade security. We never share your personal health information.", colorClass: "text-brand-500", bgClass: "bg-brand-50" }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all group"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bgClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${feature.colorClass}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">How MediGuardian Works</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Three simple steps to secure your medical journey and get peace of mind.</p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-center items-start gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-brand-100 via-emerald-100 to-brand-100 -z-10" />
          
          {[
            { step: "01", icon: FileText, title: "Upload Documents", desc: "Securely scan or take photos of your medical reports and prescriptions." },
            { step: "02", icon: BrainCircuit, title: "AI Cross-Check", desc: "Our engine analyzes your data against global medical guidelines in seconds." },
            { step: "03", icon: CheckCircle2, title: "Receive Insights", desc: "Get a clear, understandable summary highlighting any red flags or anomalies." }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.2 }}
              className="flex-1 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-6 relative z-10">
                <item.icon className="w-10 h-10 text-brand-600" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center border-2 border-white text-sm shadow-sm">
                  {item.step}
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-slate-600">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Capabilities Section */}
      <section id="ai" className="w-full bg-slate-900 py-24 text-white relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-brand-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Powered by Specialized Medical AI</h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              MediGuardian isn't a generic chatbot. A deterministic rules engine decides every safety flag, and the language model explains it in plain words — grounded strictly in your uploaded documents.
            </p>
            <ul className="space-y-4">
              {[
                "Drug-to-Drug Interaction Checking",
                "Dosage Anomaly Detection",
                "Unnecessary Procedure Flagging",
                "Plain-English Medical Summaries"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-3xl shadow-2xl">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div className="text-brand-400">&gt; Analyzing Prescription_Ref_1092.pdf...</div>
                <div className="text-slate-300">Extracting entities: [Amoxicillin 500mg], [Ibuprofen 400mg]</div>
                <div className="text-emerald-400">&gt; Checking interactions...</div>
                <div className="text-yellow-400">! Warning: Potential moderate interaction detected.</div>
                <div className="bg-slate-900/50 p-3 rounded-lg text-slate-300">
                  NSAIDs (Ibuprofen) may decrease the efficacy of certain antibiotics in rare cases. Please consult your physician.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="w-full py-24 max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-semibold text-slate-400 uppercase tracking-widest mb-12">Built with Modern Technologies</h2>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          {["Next.js 15", "React 19", "Tailwind CSS", "Framer Motion", "Supabase", "OpenAI"].map((tech, idx) => (
            <div key={idx} className="text-2xl font-bold text-slate-800">
              {tech}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-slate-50 border-t border-slate-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold">
                M
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">MediGuardian AI</span>
            </div>
            <p className="text-slate-500 max-w-sm mb-6">
              Empowering patients with AI-driven medical transparency, security, and precision.
            </p>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center hover:bg-brand-100 hover:text-brand-600 transition-colors cursor-pointer text-slate-500">
                  <div className="w-4 h-4 bg-current rounded-sm" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-4">Platform</h4>
            <ul className="space-y-2 text-slate-600">
              <li><a href="#" className="hover:text-brand-600 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">How it works</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Security</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 mb-4">Legal</h4>
            <ul className="space-y-2 text-slate-600">
              <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Medical Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="mx-auto mb-6 max-w-3xl"><MedicalDisclaimer /></div>
          <p className="text-slate-500 text-sm">© 2026 MediGuardian AI · Built for the YGC AI Buildathon 2026.</p>
          <p className="text-red-500 font-medium text-xs uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className="w-4 h-4" /> Not a replacement for professional medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
