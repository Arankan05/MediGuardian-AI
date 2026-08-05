"use client";

import { useEffect, useState } from "react";
import { FileText, Clock, Menu, X, ShieldCheck, Activity, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Brand";
import { resolveActivePatient } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  // Whose records are we looking at? Resolved from the uploaded documents.
  useEffect(() => {
    resolveActivePatient().then(setActivePatient).catch(() => setActivePatient(undefined));
  }, [pathname]);

  const initials = activePatient
    ? activePatient.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "—";

  const navItems = [
    { name: "Upload Reports", href: "/dashboard/upload", icon: FileText },
    { name: "AI Summary", href: "/dashboard/summary", icon: BrainCircuit },
    { name: "Patient Timeline", href: "/dashboard/timeline", icon: Clock },
    { name: "Medical Safety", href: "/dashboard/safety", icon: ShieldCheck },
    { name: "Lab Trends", href: "/dashboard/trends", icon: Activity },
    { name: "AI Assistant", href: "/dashboard/assistant", icon: BrainCircuit },
  ];


  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 z-20">
        <Link href="/">
          <div className="p-6 flex items-center gap-3 border-b border-slate-200/60 cursor-pointer">
            <Logo size={34} />
            <span className="text-xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
              MediGuardian<span className="text-brand-600 dark:text-brand-400"> AI</span>
            </span>
          </div>
        </Link>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/25" 
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-brand-600 dark:hover:text-brand-400"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/60">
          <div className="bg-gradient-to-r from-brand-50 to-accent-300/20 rounded-xl p-4 border border-brand-100/50 flex flex-col items-center text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">Private by design</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Records stay in your local database.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col z-10 relative">
        {/* Top Navbar */}
        <header className="h-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-brand-100 dark:border-brand-800/50 bg-white/80 dark:bg-slate-800/80 px-3.5 py-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Cross-checking active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200/60 dark:border-slate-800/60">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {activePatient ?? "No records yet"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activePatient ? "Active patient" : "Upload documents to begin"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-100 to-brand-200 border-2 border-white shadow-sm flex items-center justify-center text-brand-700 font-bold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <Logo size={34} />
                  <span className="text-xl font-bold tracking-tight text-brand-900 dark:text-brand-100">
                    MediGuardian<span className="text-brand-600 dark:text-brand-400"> AI</span>
                  </span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <div
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                          isActive 
                            ? "bg-brand-600 text-white shadow-md shadow-brand-500/25" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-brand-600"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
