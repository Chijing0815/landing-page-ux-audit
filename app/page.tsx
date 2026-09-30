'use client';

import { useState } from 'react';

interface AuditFix {
  issue: string;
  recommendation: string;
  suggestedCopy?: string;
}

interface AuditResult {
  overallScore: number;
  headlineClarity: number;
  ctaScore: number;
  summary: string;
  fixes: AuditFix[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      // 1. Check if the server returned an HTML error page (404/500)
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Server returned HTML response:', text);
        throw new Error(`Server Error (${res.status}): Please check folder path or Vercel logs.`);
      }

      // 2. Safe to parse JSON now
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze page');
      }

      setResult(data.audit);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Landing Page UX & Conversion Auditor
          </h1>
          <p className="text-slate-400 text-lg">
            Paste your URL below to get an instant AI-powered CRO score and actionable conversion fixes.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAudit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Auditing...
              </>
            ) : (
              'Audit Page'
            )}
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Audit Results View */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Score Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-400">Overall Score</span>
                <p className="text-4xl font-bold text-blue-400">{result.overallScore}/100</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-400">Headline Clarity</span>
                <p className="text-4xl font-bold text-emerald-400">{result.headlineClarity}/100</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-slate-400">CTA Effectiveness</span>
                <p className="text-4xl font-bold text-indigo-400">{result.ctaScore}/100</p>
              </div>
            </div>

            {/* Audit Summary */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-2">
              <h2 className="text-xl font-semibold text-slate-200">Executive Summary</h2>
              <p className="text-slate-300 leading-relaxed">{result.summary}</p>
            </div>

            {/* Recommended Fixes */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
              <h2 className="text-xl font-semibold text-slate-200">Actionable Fixes</h2>
              <div className="space-y-4">
                {result.fixes.map((fix, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/80 p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-red-400">Issue: {fix.issue}</p>
                    <p className="text-slate-300">
                      <span className="font-medium text-slate-100">Fix:</span> {fix.recommendation}
                    </p>
                    {fix.suggestedCopy && (
                      <div className="bg-slate-900 p-3 rounded text-sm font-mono text-emerald-300 border border-emerald-900/40">
                        Suggested Copy: "{fix.suggestedCopy}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}