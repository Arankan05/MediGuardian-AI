"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, ShieldCheck, Loader2, Bot, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { askAssistant, resolveActivePatient } from "@/lib/api";

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  confidence: number | null;
  sources?: string[];
  error?: boolean;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [patientName, setPatientName] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hello! I've analyzed your medical documents. What would you like to know about your medical history?",
      isBot: true,
      confidence: null,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      resolveActivePatient().then(setPatientName).catch(() => setPatientName(undefined));
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      text: query,
      isBot: false,
      confidence: null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await askAssistant(query, patientName);
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: res.answer || "I could not find relevant information in your uploaded records.",
        isBot: true,
        confidence: res.confidence_score ?? null,
        sources: res.supporting_documents || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        text: err.message || "Failed to reach the medical assistant server. Please check your backend connection.",
        isBot: true,
        confidence: null,
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-[80px] right-[40px] rounded-full w-[65px] h-[65px] p-0 z-[900] shadow-[0_10px_25px_rgba(59,130,246,0.5)] bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <MessageSquare size={30} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-[100px] right-[40px] w-[400px] h-[600px] flex flex-col z-[1001] overflow-hidden bg-slate-900/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl border border-white/10"
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <ShieldCheck color="#3b82f6" size={24} />
                <strong className="text-lg tracking-wide text-white">MediGuardian AI</strong>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="bg-transparent border-none text-slate-400 cursor-pointer p-1 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              {messages.map((msg: ChatMessage) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`max-w-[85%] ${msg.isBot ? "self-start" : "self-end"}`}
                >
                  <div
                    className={`p-4 text-white text-base leading-relaxed shadow-sm ${
                      msg.error
                        ? "bg-rose-900/80 border border-rose-500/50 rounded-2xl rounded-bl-sm"
                        : msg.isBot
                        ? "bg-white/10 rounded-2xl rounded-bl-sm"
                        : "bg-gradient-to-br from-brand-600 to-brand-600 rounded-2xl rounded-br-sm"
                    }`}
                  >
                    {msg.error && <AlertTriangle className="inline w-4 h-4 mr-2 text-rose-400" />}
                    {msg.text}
                  </div>
                  {msg.confidence !== null && (
                    <div className="text-sm text-emerald-400 mt-2 pl-2 font-medium">
                      ✓ Confidence Score: {msg.confidence}%
                    </div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex gap-1 mt-1 pl-2 flex-wrap">
                      {msg.sources.map((s, idx) => (
                        <span key={idx} className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start max-w-[85%]">
                  <div className="p-4 bg-white/10 rounded-2xl rounded-bl-sm text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                    <span className="text-sm font-medium">Reading patient records...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-3 bg-black/20">
              <input
                type="text"
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="Ask about your records..."
                disabled={isLoading}
                className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-base font-sans focus:border-brand-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-brand-600 text-white px-5 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
