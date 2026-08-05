"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askAssistant, resolveActivePatient } from "@/lib/api";
import { Send, Bot, User, FileText, CheckCircle2, Info, ArrowRight, ShieldAlert, Zap, Loader2 } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  supporting_documents?: string[];
  confidence_score?: number;
  medical_disclaimer?: string;
  follow_up_suggestions?: string[];
};

const SUGGESTED_PROMPTS = [
  "Show Timeline",
  "Explain Blood Sugar Trend",
  "Show Duplicate Medicines",
  "Compare Last Two Visits",
  "What medicines am I currently taking?",
  "Did any medicine conflict with my allergy?"
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your AI Medical Assistant. I have analyzed your complete medical history, including timelines, lab trends, and safety alerts. How can I help you understand your health data today?",
      follow_up_suggestions: SUGGESTED_PROMPTS.slice(0, 4)
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // The active patient is resolved from whatever documents were actually
  // uploaded — never assumed. Undefined means "reason across all records".
  const [patientName, setPatientName] = useState<string | undefined>(undefined);

  useEffect(() => {
    resolveActivePatient().then(setPatientName).catch(() => setPatientName(undefined));
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await askAssistant(text, patientName);
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer || "I'm sorry, I could not process that request.",
        supporting_documents: data.supporting_documents || [],
        confidence_score: data.confidence_score || 0,
        medical_disclaimer: data.medical_disclaimer,
        follow_up_suggestions: data.follow_up_suggestions || []
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm sorry, I cannot reach the server at the moment. Please ensure the backend is running.",
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col pt-6 px-4">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Medical Assistant</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            Strictly grounded in your uploaded medical records
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-brand-100 text-brand-600' : 'bg-brand-600 text-white'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
                
                {/* Main Text Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none leading-relaxed'
                }`}>
                  {msg.content}
                </div>

                {/* AI Meta Data (Confidence, Sources, Disclaimer) */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <div className="mt-3 w-full bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Confidence Badge */}
                      {msg.confidence_score !== undefined && (
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                          <Zap className={`w-4 h-4 ${msg.confidence_score > 85 ? 'text-emerald-500' : msg.confidence_score > 50 ? 'text-amber-500' : 'text-rose-500'}`} />
                          <span className="text-xs font-bold text-slate-700">{msg.confidence_score}% Confidence</span>
                        </div>
                      )}

                      {/* Sources */}
                      {msg.supporting_documents && msg.supporting_documents.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div className="flex gap-1.5 flex-wrap">
                            {msg.supporting_documents.map((doc, idx) => (
                              <span key={idx} className="text-[10px] uppercase tracking-wider font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Disclaimer */}
                    {msg.medical_disclaimer && (
                      <p className="text-[10px] text-slate-400 italic flex items-start gap-1 leading-tight">
                        <Info className="w-3 h-3 shrink-0" />
                        {msg.medical_disclaimer}
                      </p>
                    )}
                  </div>
                )}

                {/* Suggested Follow-ups */}
                {msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-start">
                    {msg.follow_up_suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading}
                        className="text-xs font-medium bg-white border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-50 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {suggestion} <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

              </div>
            </motion.div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex flex-shrink-0 items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Analyzing medical records...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="py-6 bg-slate-50 border-t border-slate-200 mt-auto">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your medical history..."
            disabled={isLoading}
            className="w-full bg-white border border-slate-300 rounded-full pl-6 pr-14 py-4 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:hover:bg-brand-600 shadow-md"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
      
    </div>
  );
}
