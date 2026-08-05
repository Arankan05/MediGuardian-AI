"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus, Info, AlertCircle, Bot, ArrowRight, ShieldAlert, Loader2, AlertTriangle, Calendar } from "lucide-react";

type LabHistory = {
  date: string;
  result: string;
  unit: string;
  normal_range: string;
  is_abnormal: boolean;
};

type AITrendAnalysis = {
  summary: string;
  trend: string;
  possible_concern: string;
  recommendation: string;
  confidence_score: number;
  medical_disclaimer: string;
};

type TrendData = {
  test_name: string;
  history: LabHistory[];
  latest_result: LabHistory | null;
  previous_result: LabHistory | null;
  ai_analysis: AITrendAnalysis;
};

const getTrendIcon = (trend: string) => {
  switch (trend?.toLowerCase()) {
    case 'increasing': return <TrendingUp className="w-5 h-5 text-rose-500" />;
    case 'decreasing': return <TrendingDown className="w-5 h-5 text-emerald-500" />;
    case 'fluctuating': return <Activity className="w-5 h-5 text-amber-500" />;
    default: return <Minus className="w-5 h-5 text-brand-500" />;
  }
};

export default function LabTrendsDashboard() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    fetch(`${API_URL}/lab-trends`)
      .then(async res => {
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.detail || "Failed to fetch lab trends");
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTrends(data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch lab trends", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [API_URL]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-slate-500 font-medium">Generating AI Trend Analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg">Error loading lab trends</h3>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Activity className="w-8 h-8 text-brand-600" /> AI Laboratory Trends
        </h1>
        <p className="text-slate-500 mt-2">Interactive tracking and AI-powered explanations of your laboratory results over time.</p>
      </div>

      {trends.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No laboratory results found</h3>
          <p className="text-slate-500 mt-2">Upload medical records containing lab results to see trends.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {trends.map((trendData, idx) => {
            const { test_name, history, latest_result, previous_result, ai_analysis } = trendData;
            const isExpanded = expandedCard === test_name;
            
            // Prepare chart data (parse floats for Recharts)
            const chartData = (history || []).map(h => ({
              date: h.date,
              value: parseFloat(h.result) || 0,
              is_abnormal: h.is_abnormal
            }));

            // Determine graph bounds
            let minRange = 0, maxRange = 100;
            if (latest_result && latest_result.normal_range) {
              const matches = latest_result.normal_range.match(/[-+]?\d*\.\d+|\d+/g);
              if (matches && matches.length >= 2) {
                minRange = parseFloat(matches[0]);
                maxRange = parseFloat(matches[1]);
              }
            }

            return (
              <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Card Header (Summary) */}
                <div 
                  className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
                  onClick={() => setExpandedCard(isExpanded ? null : test_name)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-slate-800">{test_name}</h2>
                      {latest_result?.is_abnormal && (
                        <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Abnormal
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{ai_analysis?.summary}</p>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Latest Result */}
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Latest Result</p>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className={`text-3xl font-bold ${latest_result?.is_abnormal ? 'text-rose-600' : 'text-slate-800'}`}>
                          {latest_result?.result || "-"}
                        </span>
                        <span className="text-sm font-medium text-slate-500">{latest_result?.unit}</span>
                      </div>
                    </div>
                    
                    {/* Trend Indicator */}
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      {getTrendIcon(ai_analysis?.trend)}
                    </div>
                  </div>
                </div>

                {/* Expanded Graph & AI Analysis */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 bg-slate-50/50"
                    >
                      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Interactive Graph */}
                        <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-slate-200 p-4 shadow-inner relative">
                           <h3 className="text-sm font-semibold text-slate-600 mb-4 ml-2">Historical Graph ({latest_result?.unit})</h3>
                           <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} axisLine={false} tickLine={false} />
                              <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                              />
                              {/* Highlight Normal Range */}
                              {maxRange > minRange && (
                                <ReferenceArea y1={minRange} y2={maxRange} fill="#10b981" fillOpacity={0.05} />
                              )}
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={(props) => {
                                  const { cx, cy, payload } = props;
                                  return (
                                    <circle 
                                      cx={cx} cy={cy} r={5} 
                                      fill={payload.is_abnormal ? '#e11d48' : '#3b82f6'} 
                                      stroke="#fff" strokeWidth={2} 
                                    />
                                  );
                                }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <div className="absolute top-4 right-6 flex items-center gap-2">
                             <div className="w-3 h-3 bg-emerald-500/20 rounded border border-emerald-500/50" />
                             <span className="text-xs text-slate-500 font-medium">Normal Range ({latest_result?.normal_range})</span>
                          </div>
                        </div>

                        {/* AI Explanation Box */}
                        <div className="lg:col-span-1 flex flex-col h-full">
                          <div className="bg-gradient-to-b from-brand-50 to-brand-50/30 rounded-2xl border border-brand-100 p-6 flex-1 shadow-sm relative overflow-hidden">
                            {/* Bot Icon Watermark */}
                            <Bot className="absolute -bottom-6 -right-6 w-32 h-32 text-brand-600/5" />
                            
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-bold text-brand-900 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-brand-600" /> AI Insights
                              </h3>
                              <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded">
                                {ai_analysis?.confidence_score}% Confidence
                              </span>
                            </div>

                            <div className="space-y-4 relative z-10">
                              <div>
                                <h4 className="text-xs font-bold text-brand-800 uppercase tracking-wider mb-1">Detected Trend</h4>
                                <p className="text-sm text-brand-900 font-medium flex items-center gap-1">
                                  {getTrendIcon(ai_analysis?.trend)} {ai_analysis?.trend}
                                </p>
                              </div>

                              {ai_analysis?.possible_concern && ai_analysis?.possible_concern !== "Unknown" && (
                                <div>
                                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Possible Concern
                                  </h4>
                                  <p className="text-sm text-rose-900 leading-relaxed bg-white/60 p-2 rounded border border-rose-200">
                                    {ai_analysis?.possible_concern}
                                  </p>
                                </div>
                              )}

                              <div>
                                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Recommendation</h4>
                                <p className="text-sm text-emerald-900 leading-relaxed bg-white/60 p-2 rounded border border-emerald-200">
                                  {ai_analysis?.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Medical Disclaimer */}
                          <div className="mt-4 flex items-start gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-500 leading-tight uppercase tracking-wide">
                              {ai_analysis?.medical_disclaimer}
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
  );
}
