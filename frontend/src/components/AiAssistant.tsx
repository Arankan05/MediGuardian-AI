"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define the type for chat messages
interface ChatMessage {
  text: string;
  isBot: boolean;
  confidence: number | null;
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Hello! I've analyzed your medical documents. What would you like to know about your medical history?", isBot: true, confidence: null }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev: ChatMessage[]) => [...prev, { text: input, isBot: false, confidence: null }]);
    setInput('');
    
    // Simulate thinking delay
    setTimeout(() => {
      setMessages((prev: ChatMessage[]) => [...prev, { 
        text: "Based on the Jan 15 prescription and Nov 05 doctor note, you were prescribed Atorvastatin for palpitations, and Lisinopril was added later for blood pressure management.", 
        isBot: true, 
        confidence: 96 
      }]);
    }, 1500);
  };

  return (
    <>
      <button 
        className="fixed bottom-[80px] right-[40px] rounded-full w-[65px] h-[65px] p-0 z-[900] shadow-[0_10px_25px_rgba(59,130,246,0.5)] bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
        onClick={() => setIsOpen(true)}
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
              <button onClick={() => setIsOpen(false)} className="bg-transparent border-none text-slate-400 cursor-pointer p-1 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              {messages.map((msg: ChatMessage, i: number) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={`max-w-[85%] ${msg.isBot ? 'self-start' : 'self-end'}`}
                >
                  <div className={`p-4 text-white text-base leading-relaxed shadow-sm ${msg.isBot ? 'bg-white/10 rounded-2xl rounded-bl-sm' : 'bg-gradient-to-br from-brand-600 to-brand-600 rounded-2xl rounded-br-sm'}`}>
                    {msg.text}
                  </div>
                  {msg.confidence !== null && (
                    <div className="text-sm text-emerald-400 mt-2 pl-2 font-medium">
                      ✓ Confidence Score: {msg.confidence}%
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-3 bg-black/20">
              <input 
                type="text" 
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                placeholder="Ask about your records..."
                className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none text-base font-sans focus:border-brand-500 transition-colors"
              />
              <button type="submit" className="bg-brand-600 text-white px-5 rounded-xl hover:bg-brand-700 transition-colors">
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
