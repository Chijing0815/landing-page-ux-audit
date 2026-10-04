'use client';

import { useState, useEffect, FormEvent } from 'react';

interface AuditResult {
  overall_score: number;
  key_issues: string[];
  recommendations: string[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [credits, setCredits] = useState<number>(3);

  // Load remaining free credits from localStorage on startup
  useEffect(() => {
    const savedCredits = localStorage.getItem('audit_credits');
    if (savedCredits !== null) {
      setCredits(parseInt(savedCredits, 10));
    } else {
      localStorage.setItem('audit_credits', '3');
      setCredits(3);
    }
  }, []);

  const handleAudit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (credits <= 0) {
      setError("You've used all your free audits! Upgrade to Pro for unlimited access.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate audit');
      }

      setResult(data);

      // Decrement and save credits
      const newCredits = credits - 1;
      setCredits(newCredits);
      localStorage.setItem('audit_credits', newCredits.toString());

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    // Paste your exact Stripe payment link here
    window.location.href = 'https://buy.stripe.com/test_8x214m1Wf5gP6dpfPK0Fi00';
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center px-4 py-12 selection:bg-emerald-500 selection:text-black">
      {/* Top Credit Counter Bar */}
      <div className="absolute top-4 right-4 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full text-sm flex items-center gap-3 shadow-lg">
        <span className="text-gray-400">Free Audits Left: <strong className="text-emerald-400">{credits}/3</strong></span>
        {credits === 0 && (
          <button 
            onClick={handleUpgrade}
            className="bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full hover:bg-emerald-400 transition"
          >
            Upgrade Pro
          </button>
        )}
      </div>

      <div className="max-w-2xl w-full text-center mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
          Landing Page UX & Conversion Auditor
        </h1>
        <p className="text-gray-400 mb-8 text-sm md:text-base">
          Paste your URL below to get a real, uncompromised AI-powered CRO audit.
        </p>

        {/* Audit Input Form */}
        <form onSubmit={handleAudit} className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={loading || credits <= 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {loading ? 'Analyzing...' : 'Audit Page'}
          </button>
        </form>

        {/* Out of Credits / Upgrade Banner */}
        {credits <= 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl mb-6 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>You have exhausted your 3 free preview audits. Go Pro for unlimited access!</span>
            <button
              onClick={handleUpgrade}
              className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg hover:bg-amber-400 transition text-xs whitespace-nowrap"
            >
              Get Unlimited ($9/mo)
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm text-left">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Box */}
        {result && (
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 text-left shadow-xl space-y-6 mt-6 backdrop-blur">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-gray-200">Audit Report</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Score:</span>
                <span className={`text-2xl font-black ${result.overall_score >= 80 ? 'text-emerald-400' : result.overall_score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                  {result.overall_score}/100
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">Key Conversion Issues</h3>
              <ul className="space-y-2">
                {result.key_issues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span> {issue}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Actionable Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}